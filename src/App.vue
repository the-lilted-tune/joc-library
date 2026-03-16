<script setup lang="ts">
import {ref, computed, onMounted, watch} from 'vue';
import Papa from 'papaparse';

  //GOOGLE SHEETS PARSING
  //TUMBLR API FETCHING
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAzSMI6_nkDmlFgbNpqpZUbjFvkEZLD0EqMjyh4fExl-T5pihDu89cyI3Tg77U-00-s6SvhXnnxLu/pub?gid=0&single=true&output=csv";
const API_KEY = '0vx5SGdnaG4e7yOrnZlsYtjaZ7ENe87yomO4gTfX3SuNNBUb5d';
const BLOG = 'the-lilted-tune';

const loading = ref(true);
const dropdownCategories = ['Character', 'Fic Type', 'Pairing', 'Rating'];
const dropdownOptions = ref({});
const tagCategories = ref<Record<string, { tags: string[], explicitOnly: boolean }>>({});

const explicitPrefix = '18+:';

const posts = ref([]);

//Using Papa library to parse
onMounted(async() => {
  //Google Sheets
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header:true });

  const rows = parsed.data;
  const headers = Object.keys(rows[0] || {});

  dropdownCategories.forEach(cat => {
    dropdownOptions.value[cat] = rows
      .map(r => r[cat]?.trim())
      .filter(Boolean);
  })

  headers.forEach(header => {
    const trimmed = header.trim();
    if (dropdownCategories.includes(trimmed)) return

    const isExplicit = trimmed.startsWith(explicitPrefix);
    const displayName = isExplicit
      ? trimmed.slice(explicitPrefix.length).trim()
      : trimmed;

    tagCategories.value[displayName] = {
      tags: rows.map(r => r[header]?.trim()).filter(Boolean),
      explicitOnly: isExplicit
    }
  })

  //Tumblr API
  
  const limit = 50;
  let offset = 0;
  let totalPosts = Infinity;

  while (offset < totalPosts) {
    try {
    const response = await fetch(
      `https://api.tumblr.com/v2/blog/${BLOG}.tumblr.com/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}`
    );
    const json = await response.json();
    totalPosts = json.response.total_posts;
    posts.value.push(...json.response.posts);
    offset += limit;
    } catch (err) {
    console.error('Failed to fetch posts at offset', offset, err);
    break;
    }
  }
  loadSavedFilters();
  loading.value = false;

  //Handling click events
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.dropdown')) {
      openDropdown.value = null;
    }
  });
})

  //FILTER UI
const selectedDropdowns = ref({});

const openDropdown = ref(null);

function toggleDropdown(cat) {
  openDropdown.value = openDropdown.value === cat ? null : cat;
}

function selectOption(cat, value) {
  selectedDropdowns.value[cat] = value;
  openDropdown.value = null;
}


const tagStates = ref({});

const expandedCategories = ref<Record<string, boolean>>({});

function toggleExpand(category: string) {
  expandedCategories.value[category] = !expandedCategories.value[category];
}

function cycleTag(tag) {
  const current = tagStates.value[tag];
  const newState = {...tagStates.value};

  if (!current) {
    newState[tag] = 'include';
  } else if (current === 'include') {
    newState[tag] = 'exclude';
  } else {
    delete newState[tag];
  }

  tagStates.value = newState;
}

  //FILTER FUNCTIONALITY
const appliedDropdowns = ref({});
const appliedTagStates = ref({});
const expandedSeries = ref<Record<string, boolean>>({});
const masterlistPrefix = 'masterlist:';


function applyFilters() {
  appliedDropdowns.value = { ...selectedDropdowns.value };
  appliedTagStates.value = { ...tagStates.value };
  currentPage.value = 1;
}

function clearFilters() {
  selectedDropdowns.value = {};
  tagStates.value = {};
  localStorage.removeItem('filters');
}

const filteredPosts = computed(() => {
  const includeTags = Object.entries(appliedTagStates.value)
    .filter(([_, state]) => state === 'include')
    .map(([tag]) => tag);

  const excludeTags = Object.entries(appliedTagStates.value)
    .filter(([_, state]) => state === 'exclude')
    .map(([tag]) => tag);

  return groupedPosts.value.filter(item => {
    const tags = item.displayPost.tags;

    for (const cat of dropdownCategories) {
      if (appliedDropdowns.value[cat] && !tags.includes(appliedDropdowns.value[cat])) {
        return false;
      }
    }

    if (includeTags.length > 0) {
      if (!includeTags.some(tag => tags.includes(tag))) return false;
    }

    if (excludeTags.length > 0) {
      if (excludeTags.some(tag => tags.includes(tag))) return false;
    }

    return true;
  });
});

const groupedPosts = computed(() => {
  const seriesMap: Record<string, { name: string, posts: any[], mainPost: any }> = {};
  const result: any[] = [];
  const seriesInserted = new Set();

  posts.value.forEach(post => {
    const seriesName = getSeriesName(post);

    if (!seriesName) {
      result.push({ type: 'standalone', post });
      return;
    }

    if (!seriesMap[seriesName]) {
      seriesMap[seriesName] = { name: seriesName, posts: [], mainPost: null };
    }
    seriesMap[seriesName].posts.push(post);

    if (!seriesInserted.has(seriesName)) {
      result.push({ type: 'series', series: seriesMap[seriesName] });
      seriesInserted.add(seriesName);
    }
  });

  Object.values(seriesMap).forEach(s => {
    s.posts.sort((a, b) => a.timestamp - b.timestamp);
    const masterlist = s.posts.find(p =>
      p.tags.some(t => t.startsWith(masterlistPrefix) && t.slice(masterlistPrefix.length).trim() === s.name)
    );
    s.mainPost = masterlist || s.posts[0];
  });

  result.forEach(item => {
    item.displayPost = item.type === 'series'
      ? item.series.mainPost
      : item.post;
  });

  return result;
});


  //GET REBLOG CONTENTS (TITLE AND SUMMARY)
function getParagraphs(post) {
  const last = post.trail[post.trail.length - 1];
  const div = document.createElement('div');
  div.innerHTML = last.content;
  const paragraphs = div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');

  return Array.from(paragraphs).filter(p => p.textContent?.trim())

}

const postContent = computed(() => {
  const map = {}
  paginatedPosts.value.forEach(item => {
    const dp = item.displayPost;
    if (!map[dp.id_string]) {
      const paragraphs = getParagraphs(dp);
      const { images, isThree } = getImages(dp);
      map[dp.id_string] = {
        title: paragraphs.length >= 1
          ? paragraphs[0].textContent?.trim() || 'Untitled'
          : dp.summary || 'Untitled',
        summary: paragraphs.length >= 2
          ? Array.from(paragraphs)
            .slice(1)
            .map(p => p.textContent?.trim())
            .join('\n\n') || 'Untitled'
          : '',
        images,
        isThree
      }
    }
      // Only process chapter posts if the series is expanded
    if (item.type === 'series' && expandedSeries.value[item.series.name]) {
      item.series.posts.forEach(post => {
        if (!map[post.id_string]) {
          const paragraphs = getParagraphs(post);
          map[post.id_string] = {
            title: paragraphs.length >= 1
              ? paragraphs[0].textContent?.trim() || 'Untitled'
              : post.summary || 'Untitled',
            summary: '',
            images: [],
            isThree: false
          }
        }
      })
    }
  })
  return map
})

  //PAGES
const currentPage = ref(1);
const POSTS_PER_PAGE = 10;

const totalPages = computed(() => {
  return Math.ceil(filteredPosts.value.length / POSTS_PER_PAGE)
});

const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * POSTS_PER_PAGE;
  return filteredPosts.value.slice(start, start + POSTS_PER_PAGE);
})


function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}




  //TAG HIGHLIGHTING
function getTagClass(tag) {
  for (const cat of dropdownCategories) {
    if(appliedDropdowns.value[cat] === tag) return 'highlight-text';
  }
  
  const state = appliedTagStates.value[tag]
  if (state) return 'highlight-text'
  
  return ''
}

  //LOCAL STORAGE
function loadSavedFilters() {
  try {
    const saved = localStorage.getItem('filters');
    if (!saved) return;
    const data = JSON.parse(saved);
    selectedDropdowns.value = data.dropdowns || {};
    tagStates.value = data.tagStates || {};
    appliedDropdowns.value = { ...(data.dropdowns || {}) };
    appliedTagStates.value = { ...(data.tagStates || {}) };
  } catch {
    // Storage not available
  }
}

watch([selectedDropdowns, tagStates], () => {
  try {
    localStorage.setItem('filters', JSON.stringify({
      dropdowns: selectedDropdowns.value,
      tagStates: tagStates.value
    }))
  } catch {
    // Storage not available
  }
}, {deep: true});

  //IMAGES
function getImages(post) {
  const div = document.createElement('div')
  div.innerHTML = post.trail[0].content_raw

  const images = div.querySelectorAll('img')
  const results = []

  for (const img of images) {
    const width = parseInt(img.getAttribute('data-orig-width'))
    const height = parseInt(img.getAttribute('data-orig-height'))
    
    results.push({
        src: img.src,
        type: (width / height) < 1.8 ? 'square' : 'wide'
    })
  }

  const squareCount = (results.filter(img => img.type === 'square').length)
  if (squareCount === 1) {
    results[0].type = 'wide'
  }

  return {
    images: results,
    isThree: squareCount % 3 === 0
  }
}

function retryImage(event) {
  const img = event.target;
  const retries = parseInt(img.dataset.retries || '0');
  if (retries < 3) {
    img.dataset.retries = String(retries + 1);
    setTimeout(() => {
      img.src = img.src;
    }, 1000 * (retries + 1));
  }
}

  //Series Functionality
const seriesPrefix = 'series:';

function getSeriesName(post) {
  const seriesTag = post.tags.find(t => t.startsWith(seriesPrefix));
  if (seriesTag) return seriesTag.slice(seriesPrefix.length).trim();

  const masterlistTag = post.tags.find(t => t.startsWith(masterlistPrefix));
  if (masterlistTag) return masterlistTag.slice(masterlistPrefix.length).trim();

  return null;
}

</script>

<template>

  <!-- Dropdowns -->
  <div v-for="cat in dropdownCategories" :key="cat" class="dropdown">
    <button @click="toggleDropdown(cat)" class="dropdown-btn">
      {{ selectedDropdowns[cat] || cat }}
    </button>
    <div v-if="openDropdown === cat" class="dropdown-menu">
      <button @click="selectOption(cat, undefined)" class="dropdown-item">
        All
      </button>
      <button
        v-for="val in dropdownOptions[cat]"
        :key="val"
        @click="selectOption(cat, val)"
        class="dropdown-item"
      >
        {{ val }}
      </button>
    </div>
  </div>

  <!-- Multi select Buttons -->
  <div
  class="tag-categories-container"
  >
    <div
      v-for="(data, category) in tagCategories"
      :key="category"
      v-show="!data.explicitOnly || selectedDropdowns['Rating'] !== 'nonexplicit'"
      class="tag-category-container"
    >
      <p class="category-header">{{ category }}</p>
      <div class="tags-container">
        <button
          v-for="tag in (expandedCategories[category] ? data.tags : data.tags.slice(0, 4))"
          :key="tag"
          class="tag-btn-css"
          :class="{
            include: tagStates[tag] === 'include',
            exclude: tagStates[tag] === 'exclude'
          }"
          @click="cycleTag(tag)"
        >
          #{{ tag }}
        </button>
        <button
          v-if="data.tags.length > 4"
          class="expand-btn"
          @click="toggleExpand(category as string)"
        >
          {{ expandedCategories[category] ? 'Show less' : `+${data.tags.length - 4} more` }}
        </button>
      </div>
    </div>
  </div>

  <!-- Go and clear Button -->
  <button
    @click="applyFilters();"
  >
    Filter
  </button>

  <button 
    class="clear-btn" 
    @click="clearFilters();"
  >
    Clear
  </button>

  <!-- Page numbers -->
   <p>Page {{ currentPage }}</p>


   

  <!-- POSTS -->
  <div 
    v-for="item in paginatedPosts" 
    :key="item.displayPost.id_string"
    class="post-container"
  >
  <!-- Post Images -->
    <div v-if="postContent[item.displayPost.id_string]?.images.length > 0"
      class="post-images"
      :class="postContent[item.displayPost.id_string].isThree ? 'odd-squares' : ''"
    >
      <img
        v-for="(img, i) in postContent[item.displayPost.id_string].images"
        :key="i"
        :src="img.src"
        :class="img.type === 'square' ? 'grid-thumbnail' : 'wide-thumbnail'"
        loading="lazy"
        @error="retryImage($event)"
      >
    </div>


    <!-- Post Title -->
    <a :href="item.displayPost.post_url" target="_blank">
      {{ postContent[item.displayPost.id_string]?.title }}
    </a>

    <!-- Post author -->
    <p class="post-author">{{ item.displayPost.trail[0].blog.name || 'Unknown' }}</p>

    <!-- Post summary -->
    <p v-if="postContent[item.displayPost.id_string]?.summary" class="post-summary">
      {{ postContent[item.displayPost.id_string].summary }}
    </p>

    <!-- Post tags -->
    <p>Tags:
      <span v-for="tag in item.displayPost.tags" :key="tag" :class="getTagClass(tag)" class="post-tag">
        #{{ tag }}
      </span>
    </p>
    

    <div v-if="item.type === 'series'" class="series-container">
      <p>{{ item.series.name }} — {{ item.series.posts.length - 1 }} chapters</p>
      <button @click="expandedSeries[item.series.name] = !expandedSeries[item.series.name]">
        {{ expandedSeries[item.series.name] ? 'Collapse' : 'Expand' }}
      </button>
      <div v-if="expandedSeries[item.series.name]">
        <div v-for="post in item.series.posts.filter(p => p.id_string !== item.displayPost.id_string)" 
          :key="post.id_string" 
          class="series-chapter"
        >
          <a :href="post.post_url" target="_blank">{{ postContent[post.id_string]?.title }}</a>
        </div>
      </div>
    </div>
  </div>
 <!-- <pre>{{ JSON.stringify(posts, null, 2) }}</pre> -->

  <!-- Nav Buttons -->
   <div class="nav-btns-container">
    <button 
      @click="currentPage--;
      scrollToTop()" 
      :disabled="currentPage <= 1"
      class="nav-prev-next-btn"
    >
      Prev
    </button>

    <button
      v-for="page in totalPages"
      :key="page"
      class="nav-number-btn"
      :class="{ active: currentPage === page }"
      @click="currentPage = page;
      scrollToTop()"
    >
      {{ page }}
    </button>

    <button 
      @click="currentPage++;
      scrollToTop()" 
      :disabled="currentPage >= totalPages"
      class="nav-prev-next-btn"

    >
      Next
    </button>

    <button 
      class="nav-top-btn" 
      @click="scrollToTop()"
    >
      Back to top &#10548;
    </button>
  </div>


</template>

<style scoped>

  button {
    padding: 6px 12px;
    margin: 4px;
    cursor: pointer;
  }

  .tag-categories-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .tag-category-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 6px;

  }

  .tags-container {
    display: flex;
    flex-direction: column;
  }

  .tag-btn-css {
    font-family: var(--tag-font);
    font-size: 12px;
    border: none;
    border-radius: 4px;
    background-color: var(--nuetral-color);
    cursor: pointer;
    transition: box-shadow 0.15s background 0.05s;
  }

  @media (max-width: 600px) {
    .tag-btn-css {
      font-size: 10px;
    }
  }

  .tag-btn-css:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .tag-btn-css.include {
    background-color:var(--include-color);
    color:white;
  }

  .tag-btn-css.exclude {
    background-color:var(--exclude-color);
    color:white;
    text-decoration: line-through;
  }

  .post-container {
    display: flex;
    flex-direction: column;
    max-width: 450px;
    margin: 20px 10px;
    border-radius: 4px;
    border: solid;
    border-color:rgb(215, 215, 215);
    padding: 10px 10px;
    border-width: 2px;
  }

  .post-images {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    /* max-width: 450px; */
  }

  .wide-thumbnail {
    width: 100%;
    max-height: 500px;
    object-fit: contain;
    border-radius: 6px;
  }

  .grid-thumbnail {
    flex: 1 1 calc(33.33% - 4px);
    height: 150px;
    object-fit: cover;
    border-radius: 4px;
  }

  .odd-squares .grid-thumbnail {
    max-width: calc(33.33% - 4px);
  }

  .post-author {
    font-style: italic;
  }

  .post-summary {
    white-space: pre-line;
  }

  .post-tag {
    font-family: var(--tag-font);
    margin-right: 6px;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 14px;
  }

  .highlight-text {
    background: linear-gradient(to right, var(--left-highlight), var(--right-highlight));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-btns-container {
    display: flex;
    justify-content: center;
  }

  .nav-prev-next-btn {
    border: none;
    font-family: 'Times New Roman', Times, serif;
    border-radius: 4px;

  }

  .nav-number-btn {
    border: none;
    background-color: rgba(0, 0, 0, 0);
    padding: 12px;
    margin: 2px 0px;

  }

  .nav-number-btn.active {
    border: none;
    border-radius: 4px;
    background-color: rgba(205, 201, 194, 0.318);

  }

  .nav-number-btn:hover {
    border: solid;
    border-radius: 6px;
    border-color: var(--nuetral-color);
  }



</style>
<script setup lang="ts">
import {ref, computed, onMounted, watch} from 'vue';
import Papa from 'papaparse';

  //GOOGLE SHEETS PARSING
  //TUMBLR API FETCHING
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAzSMI6_nkDmlFgbNpqpZUbjFvkEZLD0EqMjyh4fExl-T5pihDu89cyI3Tg77U-00-s6SvhXnnxLu/pub?gid=0&single=true&output=csv";
const API_KEY = '0vx5SGdnaG4e7yOrnZlsYtjaZ7ENe87yomO4gTfX3SuNNBUb5d';
const BLOG = 'jackoconnells-suspenders';


const characters = ref([]);
const wordCounts = ref([]);
const loading = ref(true);
const dropdownCategories = ['Character', 'Word Count'];

const tagCategories = ref({});

const posts = ref([]);

//Using Papa library to parse
onMounted(async() => {
  //Google Sheets
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header:true });

  const rows = parsed.data;
  const headers = Object.keys(rows[0] || {});

  characters.value = rows.map(r => r['Character']?.trim()).filter(Boolean);
  wordCounts.value = rows.map(r => r['Word Count']?.trim()).filter(Boolean);

  headers.forEach(header => {
    const trimmed = header.trim();
    if (dropdownCategories.includes(trimmed)) return

    tagCategories.value[trimmed] = rows
      .map(r => r[header]?.trim())
      .filter(Boolean)
  })

  //Tumblr API
  
  const limit = 50;
  let offset = 0;
  let totalPosts = Infinity;

  while (offset < totalPosts) {
    const response = await fetch(
      `https://api.tumblr.com/v2/blog/${BLOG}.tumblr.com/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}`
    );
    const json = await response.json();

    totalPosts = json.response.total_posts;
    posts.value.push(...json.response.posts);
    offset += limit;
  }
  loadSavedFilters();
  loading.value = false;
}
)

  //FILTER UI

//Dropdowns (Mutually Exclusive Categories)
const selectedCharacter = ref(null);
const selectedWordCount = ref(null);

//Multi-select General Tags
const tagStates = ref({});

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
const appliedCharacter = ref(null);
const appliedWordCount = ref(null);
const appliedTagStates = ref({});

function applyFilters() {
  appliedCharacter.value = selectedCharacter.value;
  appliedWordCount.value = selectedWordCount.value;
  appliedTagStates.value = { ...tagStates.value };
  currentPage.value = 1;
}

function clearFilters() {
  selectedCharacter.value = null;
  selectedWordCount.value = null;
  tagStates.value = {};
  localStorage.removeItem('filters');
}

const displayedPosts = computed(() => {
  const includeTags = Object.entries(appliedTagStates.value)
    .filter(([_, state]) => state === 'include')
    .map(([tag, _]) => tag);

  const excludeTags = Object.entries(appliedTagStates.value)
    .filter(([_, state]) => state === 'exclude')
    .map(([tag, _]) => tag);

  return posts.value.filter(post => {
    if(appliedCharacter.value && !post.tags.includes(appliedCharacter.value)) {
      return false
    }

    if(appliedWordCount.value && !post.tags.includes(appliedWordCount.value)) {
      return false
    }

    if (includeTags.length > 0) {
      if (!includeTags.some(tag => post.tags.includes(tag))) return false
    }

    if (excludeTags.length > 0) {
      if (excludeTags.some(tag => post.tags.includes(tag))) return false
    }

    return true
  })
})


  //GET REBLOG CONTENTS (TITLE AND SUMMARY)
function getParagraphs(post) {
  const last = post.trail[post.trail.length - 1];
  const div = document.createElement('div');
  div.innerHTML = last.content;
  const paragraphs = div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');

  return paragraphs;

}

function getTitle(post) {
  //post.trail is an array of all the reblogs (we're the last one)
  const paragraphs = getParagraphs(post);
  
  if (paragraphs.length > 1) { //Has summary
    return paragraphs[1].textContent?.trim() || 'Untitled';
  } else if (paragraphs.length > 0) { //Doesn't have summary
    return paragraphs[0].textContent?.trim() || 'Untitled';
  }
  return post.summary || 'Untitled'
}

function getSummary(post) {
  const paragraphs = getParagraphs(post);

  if (paragraphs.length > 2) { //Has Summary
    return Array.from(paragraphs)
      .slice(2)
      .map(p => p.textContent?.trim())
      .join(`\n\n`) || 'Untitled' 
  }
  //Doesn't have summary
  return ''
}

  //PAGES
const currentPage = ref(1);
const POSTS_PER_PAGE = 20;

const totalPages = computed(() => {
  return Math.ceil(displayedPosts.value.length / POSTS_PER_PAGE)
});

const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * POSTS_PER_PAGE;
  return displayedPosts.value.slice(start, start + POSTS_PER_PAGE);
})


function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}




  //TAG HIGHLIGHTING
function getTagClass(tag) {
  if (appliedCharacter.value === tag || appliedWordCount.value === tag ) return 'highlight-text'
  
  const state = appliedTagStates.value[tag]
  if (state) return 'highlight-text'
  
  return ''
}

  //LOCAL STORAGE
function loadSavedFilters() {
  try {
    const saved = localStorage.getItem('filters');
    if (!saved) return
    const data = JSON.parse(saved);
    selectedCharacter.value = data.character;
    selectedWordCount.value = data.wordCount;
    tagStates.value = data.tagStates || {};
    appliedCharacter.value = data.character;
    appliedWordCount.value = data.wordCount;
    appliedTagStates.value = { ...(data.tagStates || {})};
  } catch {
    // Storage not available
  }
}

watch([selectedCharacter, selectedWordCount, tagStates], () => {
  try {
    localStorage.setItem('filters', JSON.stringify({
      character: selectedCharacter.value,
      wordCount: selectedWordCount.value,
      tagStates: tagStates.value
    }))
  } catch {
    // Storage not available
  }
})

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
  console.log(`post title: ${getTitle(post)} - squareCount: ${squareCount}`)

  return {
    images: results,
    isThree: squareCount % 3 === 0
  }
}

</script>

<template>

  <!-- Character Dropdown -->
  <div>
    <label>Character: </label>
    <select v-model="selectedCharacter">
      <option :value="null">All</option>
      <option 
        v-for="c in characters"
        :key="c"
        :value="c"
      >
        {{ c }}
      </option>
    </select>
  </div>

  <!-- WordCount Dropdown -->
  <div>
    <label>Word Count: </label>
    <select v-model="selectedWordCount">
      <option :value="null">All</option>
      <option 
        v-for="w in wordCounts"
        :key="w"
        :value="w"
      >
        {{ w }}
      </option>
    </select>
  </div>

  <!-- Multi select Buttons -->
  <div
    class="tag-categories-container"
  >
    <div 
      v-for="(tags, category) in tagCategories" 
      :key="category" 
      class="tag-category-container">
    <p class="category-header">{{ category }}</p>
    <div
      class="tags-container"
    >
      <button
        v-for="tag in tags"
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

  <!-- Posts -->
  <p>Posts displayed: {{ displayedPosts.length }}</p>
  <div 
    v-for="post in paginatedPosts" 
    :key="post.id_string"
  >
    <div v-if="getImages(post).images.length > 0" 
      class="post-images"
      :class="getImages(post).isThree ? 'odd-squares' : ''"
    >
      <img
        v-for="(img, index) in getImages(post).images"
        :key="index"
        :src="img.src"
        :class="img.type === 'square' ? 'grid-thumbnail' : 'wide-thumbnail'"
        loading="lazy"
      >
    </div>


    <a :href="post.post_url">{{ getTitle(post) }}</a>
    <p
      class="post-author"
    >
      {{ post.trail[0].blog.name || 'Unknown' }}
    </p>
    <p 
      v-if="getSummary(post)" 
      class="post-summary"
    >
      {{ getSummary(post) }}
    </p>
    <p>Tags:
      <span
        v-for="tag in post.tags"
        :key="tag"
        :class="getTagClass(tag)"
        class="post-tag"
      >
        #{{ tag }}
      </span>
    </p>
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
    font-size: small;
    border: none;
    border-radius: 4px;
    background-color: var(--nuetral-color);
    cursor: pointer;
    transition: box-shadow 0.15s background 0.05s;

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

  .post-images {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-width: 500px;
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
    margin: 0 0 0 0;

  }

  .nav-number-btn:hover {
    border: solid;
    border-radius: 6px;
    border-color: var(--nuetral-color);
  }



</style>

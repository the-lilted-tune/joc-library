<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Papa from 'papaparse';
import bannerLight from './jocdomover.png';
import bannerDark from './general_colour_joc.png';

import { useFilterUI } from './composables/useFilterUI';
import { useFilterFunctionality } from './composables/useFilterFunctionality';
import { useOnMounted } from './composables/useOnMounted';
import { useReblogContents } from './composables/useReblogContents';
import { usePages } from './composables/usePages';
import { useDecorations } from './composables/useDecorations';
import { useLocalStorage } from './composables/useLocalStorage';
import { useImages } from './composables/useImages';
import { useSeriesFunctionality } from './composables/useSeriesFunctionality';
import { useMobile } from './composables/useMobile';
import { useThemes } from './composables/useThemes';



  //GOOGLE SHEETS PARSING
  //TUMBLR API FETCHING
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQFbxYYYd3jOVwT98e8Op6iTPSn7lThQ0fFNK0N_mr69lfQvD5dzyDxyvMoWfTemJlqvp1J6KXzdCbl/pub?gid=2112873187&single=true&output=csv";
const SERIES_ORDER_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQFbxYYYd3jOVwT98e8Op6iTPSn7lThQ0fFNK0N_mr69lfQvD5dzyDxyvMoWfTemJlqvp1J6KXzdCbl/pub?gid=926557433&single=true&output=csv"
const API_KEY = '0vx5SGdnaG4e7yOrnZlsYtjaZ7ENe87yomO4gTfX3SuNNBUb5d';
const BLOG = 'jocficlibrary';

const loading = ref(true);
const dropdownCategories = ['Character', 'Fic Length', 'Pairing', 'Rating'];
const characterSources = ref<Record<string, string>>({});
const hiddenColumns = ['Character Source'];
const dropdownOptions = ref({});
const tagCategories = ref<Record<string, { tags: string[], explicitOnly: boolean }>>({});

const posts = ref([]);
const seriesOrderMap = ref<Record<string, number[]>>({});
const currentPage = ref(1);

const masterlistPrefix = 'masterlist:';
const explicitPrefix = '18+:';
const seriesPrefix = 'series:';
const wcPrefix = 'wc:';



onMounted(async() => {
  //Cached theme and filters
  loadSavedFilters();
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    lightMode.value = true;
    document.documentElement.setAttribute('data-theme', 'light');
  }

  //PARSING
  const [response, orderResponse] = await Promise.all([
    fetch(SHEET_URL),
    fetch(SERIES_ORDER_URL)
  ]);
  const [csvText, orderCsv] = await Promise.all([
    response.text(),
    orderResponse.text()
  ]);
  const parsed = Papa.parse(csvText, { header:true });
  const rows = parsed.data;
  const headers = Object.keys(rows[0] || {});
  const orderParsed = Papa.parse(orderCsv, { header: true });
  const orderMap: Record<string, number[]> = {};

  useOnMounted(API_KEY, BLOG, loading, dropdownCategories, characterSources, hiddenColumns, dropdownOptions, tagCategories, explicitPrefix, seriesOrderMap, posts, openDropdown, rows, headers, orderParsed, orderMap);
})



//FILTER UI
const selectedDropdowns = ref({});
const openDropdown = ref(null);
const tagStates = ref({});
const expandedCategories = ref<Record<string, boolean>>({});

const { 
  toggleDropdown, 
  selectOption, 
  toggleExpand, 
  cycleTag 
} = useFilterUI(selectedDropdowns, openDropdown, tagStates, expandedCategories);



//SERIES FUNCTIONALITY
const {
  getSeriesName,
  getNumberOfParts
} = useSeriesFunctionality(seriesPrefix, masterlistPrefix);
//FILTER FUNCTIONALITY
const appliedDropdowns = ref({});
const appliedTagStates = ref({});
const expandedSeries = ref<Record<string, boolean>>({});

const { 
  applyFilters, 
  clearFilters, 
  filteredPosts, 
  groupedPosts } = useFilterFunctionality(appliedDropdowns, appliedTagStates, expandedSeries, selectedDropdowns, tagStates, currentPage, dropdownCategories, getSeriesName, seriesOrderMap, posts, masterlistPrefix);



//PAGES
const POSTS_PER_PAGE = 10;

const {
  totalPages,
  paginatedPosts,
  visiblePages,
  scrollToTop
} = usePages(POSTS_PER_PAGE, filteredPosts, currentPage);



//IMAGES
const {
  getImages,
  retryImage
} = useImages();
//GET REBLOG CONTENTS (TITLE AND SUMMARY AND WC)
const { postContent } = useReblogContents(wcPrefix, paginatedPosts, getImages, expandedSeries);



//TAGHIGHLIGHTING, LINK TO TUMBLR, AND DISPLAY CHARACTER NAMES
const {
  getTagClass,
  openPost,
  capitalize,
  formatTag
} = useDecorations(dropdownCategories, appliedDropdowns, appliedTagStates, characterSources);



//LOCAL STORAGE
const loadSavedFilters = useLocalStorage(selectedDropdowns, tagStates, appliedDropdowns, appliedTagStates);

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


//MOBILE
const {
  handleTouchStart,
  handleTouchEnd
} = useMobile();



//DARK MODE
const lightMode = ref(false);

const toggleTheme = useThemes(lightMode);

</script>



<template>
  <div class="all-container">
  
  <div class="all-filters-container">

  <!-- Dropdowns -->
   <div class="settings-heading">
  <button @click="toggleTheme" class="theme-toggle-btn">
    {{ lightMode ? '☽' : '☀' }}
  </button>
   <p class="heading">General Tags</p>
   </div>
  <div class="dropdowns-center-container">
  <div class="dropdowns-container">
  <div 
    v-for="cat in dropdownCategories" 
    :key="cat" 
    class="dropdown"
  >
    <button 
      @click="toggleDropdown(cat)" 
      class="dropdown-btn"
    >
      {{ selectedDropdowns[cat] ? (cat === 'Character' ? capitalize(selectedDropdowns[cat]) : selectedDropdowns[cat]) : cat }}
    </button>

    <div 
      v-if="openDropdown === cat" 
      class="dropdown-menu"
    >
      <button 
        @click="selectOption(cat, undefined)" class="dropdown-item"
      >
        All
      </button>
      <button
        v-for="val in dropdownOptions[cat]"
        :key="val"
        @click="selectOption(cat, val)"
        class="dropdown-item"
      >
        {{ cat === 'Character' ? formatTag(val) : val }}
      </button>
    </div>

  </div>
  </div>
  </div>

  <!-- Multi select Buttons -->
  <!-- Regular tag categories -->

  <div class="tag-categories-container">
    <div
      v-for="(data, category) in tagCategories"
      :key="category"
      v-show="!data.explicitOnly"
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
          class="tag-expand-btn"
          @click="toggleExpand(category as string)"
        >
          {{ expandedCategories[category] ? 'Show less' : `+${data.tags.length - 4} more` }}
        </button>
      </div>
    </div>
  </div>

  <!-- Explicit tag categories -->
  <div v-show="selectedDropdowns['Rating'] !== 'nonexplicit'">
    <div class="explicit-heading">
    <p class="heading">Explicit Tags</p>
    </div>
    <div class="tag-categories-container">
      <div
        v-for="(data, category) in tagCategories"
        :key="category"
        v-show="data.explicitOnly"
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
            class="tag-expand-btn"
            @click="toggleExpand(category as string)"
          >
            {{ expandedCategories[category] ? 'Show less' : `+${data.tags.length - 4} more` }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="go-and-clear-container">
  <!-- Go and clear Button -->
  <button
    @click="applyFilters();"
    class="filter-btn"
  >
    Filter
  </button>

  <button 
    class="clear-btn" 
    @click="clearFilters();"
  >
    Clear
  </button>
  </div>

  </div>

  <div class="all-posts-container">

  <!-- Page numbers -->
   <p 
      class="page-numbers"
      id="posts-top"
    >Page {{ currentPage }} of {{ totalPages }}</p>

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

    <template v-for="(page, i) in visiblePages" :key="i">
      <span v-if="page === '...'" class="nav-ellipsis">...</span>
      <button
        v-else
        class="nav-number-btn"
        :class="{ active: currentPage === page }"
        @click="currentPage = page; scrollToTop()"
      >
        {{ page }}
      </button>
    </template>

    <button 
      @click="currentPage++;
      scrollToTop()" 
      :disabled="currentPage >= totalPages"
      class="nav-prev-next-btn"

    >
      Next
    </button>
  </div>

  


  <!-- <pre>{{ JSON.stringify(posts, null, 2) }}</pre> -->

  <!-- POSTS -->
  <div
    class="posts-center-container"
  >
  <div
    class="posts-container"
  >
  
  <div 
    v-for="item in paginatedPosts" 
    :key="item.displayPost.id_string"
    class="post-container"
  >
    <div
      class="main-post-container"
      @click="openPost(item.displayPost.post_url)"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd($event, item.displayPost.post_url)"
      style="cursor: pointer;"
    >
  
      <!-- Post Images -->
       <div class="post-images-wrapper">
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
        </div>


      <!-- Post Title -->
      <div class="title-author-wc">
      <div class="title-author">
      <p class="post-title">{{ postContent[item.displayPost.id_string]?.title }}</p>
      
      <!-- Post author -->
      <p class="post-author">{{ item.displayPost.trail[0].blog.name || 'Unknown' }}</p>
      </div>

      <!-- Post Word Count -->
       <p v-if="postContent[item.displayPost.id_string]?.wordCount" class="post-wc">
        {{ postContent[item.displayPost.id_string].wordCount }} words
      </p>
      </div>

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
    </div>
    
    <!-- Post Series -->
    <div 
      v-if="item.type === 'series'" 
      class="series-container"
    >
    <div
      class="expand-container"
    >
      <p class="series-parts-p">{{ getNumberOfParts(item) }} part{{ (getNumberOfParts(item) === 1) ? '' : 's' }}</p>

      <button 
        @click="expandedSeries[item.series.name] = !expandedSeries[item.series.name]"
        class="series-expand-button">
        {{ expandedSeries[item.series.name] ? 'Collapse' : 'Expand' }}
      </button>
    </div>
      
      <div v-if="expandedSeries[item.series.name]">
        <div 
          v-for="post in item.series.posts.filter(p => 
          p.id_string !== item.displayPost.id_string || 
          !p.tags.some(t => t.startsWith(masterlistPrefix))
          )" 
          :key="post.id_string" 
          class="series-chapter-container"
          @click="openPost(post.post_url)"
        >
          <p 
            class="series-chapter-text"
          >
            	&#9656; {{ postContent[post.id_string]?.title }}
      </p>
        </div>
      </div>
    </div>
    
  </div>
  </div>
  </div>
  
 

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

    <template v-for="(page, i) in visiblePages" :key="i">
      <span v-if="page === '...'" class="nav-ellipsis">...</span>
      <button
        v-else
        class="nav-number-btn"
        :class="{ active: currentPage === page }"
        @click="currentPage = page; scrollToTop()"
      >
        {{ page }}
      </button>
    </template>

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

  </div>
  <div class="banner-container">
    <img class="banner" :src="lightMode ? bannerLight : bannerDark">
    <p class="credits">Logo Design by @scannainscanrula</p>
    <p class="credits">All coding done in Vue.js by @the-lilted-tune</p>
    <p class="note">Remember to leave a comment if you enjoyed the fic!</p>
    <p><a class="submit-link" href="https://jocficlibrary.tumblr.com/submit">Submit your own fic here!</a></p>
  </div>
  
  </div>


</template>

<style scoped>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap');
  /* * {
  outline: 2px solid red;
  } */
  
  p {
    font-family: var(--font);
    color: var(--font-color);
  }

  button {
    /* padding: 6px 12px;
    margin: 4px; */
    padding: 0px 0px;
    margin: 0px 0px;
    cursor: pointer;
    font-family:var(--font);
    color: var(--font-color);
    background-color: var(--background-color);
    border: 1px solid;
    border-image: var(--gradient-border) 1;
  }

  .all-container {
    display: flex;
    flex-direction: row;
  }

  .banner-container {
    position: sticky;
    top: 0;
    height: 100vh;
    flex-direction: column;
    /* align-items: center; */
    justify-content: flex-start;
    background-color: var(--background-color);
    padding: 12px 40px;
    display: flex;
    width: 200px;
  }

  @media (max-width: 1200px) {
    .banner-container {
      display: none;
    }
}

  .banner {
    width: 220px;
    height: 593;
    object-fit: contain;
    margin-bottom: 11px;
  }

  .credits {
    color: var(--credit-color);
    font-size: 12px;
    margin: 3px;
  }

  .submit-link {
    color: var(--credit-color);
  }


  .all-filters-container {
    display: flex;
    flex-direction: column;
    width: 46%;
    max-width: 600px;
    position: sticky;
    top: 0;
    height: 100vh;
    flex-shrink: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-color) transparent;
    padding: 0px 2%;
    background-color: var(--background-color);
  }

  .all-filters-container::-webkit-scrollbar {
    overflow: auto;
    width: 6px;
  }

  .all-filters-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .all-filters-container::-webkit-scrollbar-thumb {
    background-color: var(--border-color);
    border-radius: 3px;
  }

  .all-posts-container {
    display: flex;
    flex-direction: column;
    display: flex;
    flex-direction: column;
    flex: 1;
    align-items: center;
    min-width: 0;
    align-items: center;
  }

  .settings-heading {
    display: flex;
    align-items: center;
  }

  .theme-toggle-btn {
    position: absolute;
    left: 10px;
    padding: 6px 10px;
  }

  .dropdown {
    position: relative;
    display: inline-block;
    flex: 1 1 100px;
    min-width: 80px;
  }

  .dropdowns-container {
    margin: 10px 18px 15px 18px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    padding: 0px 24px;
  }

  .dropdown-btn {
    color: var(--font-color);
    font-family: var(--font);
    font-size: 14px;
    padding: 6px 10px;
    cursor: pointer;
    /* min-width: 120px; */
    text-align: left;
    position: relative;
    width: 100%;
  }

  .dropdown-btn::after {
    content: '▾';
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--font-color);
  }

  .dropdown-btn:hover {
    opacity: 75%
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: var(--post-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    box-shadow: 0 4px 12px rgba(42, 33, 24, 0.12);
    min-width: 100%;
    z-index: 100;
    max-height: 250px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-color) transparent;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-color);
    color: var(--font-color);
    font-family: var(--font);
    font-size: 13px;
    padding: 8px 12px;
    text-align: left;
    cursor: pointer;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background-color: var(--hover-color);
  }

  .tag-categories-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tag-category-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 6px;
    

  }

  .category-header {
    color: var(--font-color);
    margin: 4px 0px;
    font-weight: bold;
    font-variant: small-caps;
  }

  .tags-container {
    display: flex;
    flex-direction: column;
  }

  .tag-btn-css {
    margin: 4px 0px;
    padding: 4px 4px;
    font-family: var(--font);
    width: 120px;
    font-size: 13px;
    border: none;
    border-radius: 4px;
    background-color: var(--nuetral-color);
    color: var(--font-color);
    cursor: pointer;
    transition: box-shadow 0.15s background 0.05s;
    /* font-variant: small-caps; */
  }

  .go-and-clear-container {
    display: flex;
    justify-content: right;
    max-width: 700px;
    margin-top: 15px;
    margin-bottom: 20px;
  }

  @media (max-width: 600px) {

    .all-container {
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    .banner-container {
      display: flex;
      position: static;
      order: -1;
      width: 95vw;
      height: auto;
      align-items: center;
      justify-content: center;
      padding: 10px;
    }

    .banner {
      width: 50%;
    }


    .all-filters-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      position: relative;
      height: 100%;
      scrollbar-width: none;
      padding: 0px;
    }

    .all-filters-container::-webkit-scrollbar {
      overflow: none;
      width: 0px;
    }

    .all-filters-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .all-filters-container::-webkit-scrollbar-thumb {
      background-color: var(--background-color);
      border-radius: 0;
    }

    .all-posts-container {
      margin: 0px;
      margin-left: 1px;
      width: 100%;
      align-items: center;
      padding: 0 10px;
      box-sizing: border-box;
    }
    .theme-toggle-btn {
      position: absolute;
      right: 2%;
      left: 89%;
      padding: 6px 10px;
    }

    .dropdowns-container {
      padding: 0 12px;
      margin: 20px 8px;
    }
    
    .tag-btn-css {
      font-size: 12px;
      width: 120px;
    }

    .tag-categories-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      
    }

    .tag-category-container {
      width: 100%;
      align-items: center;
      margin: 0px;
    }

    .go-and-clear-container {
      display: flex;
      justify-content: center;
      align-items: center;
      /* max-width: 700px; */
      margin-top: 15px;
      margin-bottom: 20px;
    }
  }

  .tag-btn-css:hover {
    box-shadow: 0 2px 8px var(--tag-shadow);
  }

  .tag-btn-css.include {
    background-color:var(--include-color);
    color:var(--include-exclude-text);
  }

  .tag-btn-css.exclude {
    background-color:var(--exclude-color);
    color:var(--include-exclude-text);
    text-decoration: line-through;
  }

  .tag-expand-btn {
    margin: 4px 0px;
    padding: 4px 4px;
  }

  .heading {
    display: flex;
    justify-content: center;
    font-size: larger;
    font-family: var(--font);
    color: var(--heading-color);
    font-weight: bold;
    margin: 10px 0px;
    padding: 0px 0px;
    flex: 1;
    text-align: center;
  }

  

  .filter-btn,
  .clear-btn {
    padding: 6px 30px;
    
  }

  .filter-btn:hover {
    opacity: 75%;
  }

  .filter-btn {
    background-color: var(--filter-btn-color);
    color: var(--background-color);
    margin-right: 10px;
  }


  .posts-center-container {
    display: flex;
    justify-content: center;
  }

  .post-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 500px;
    margin: 20px 0px;
    border-radius: 2px;
    border: 1px solid var(--border-color);
    background-color: var(--post-color);
    -webkit-tap-highlight-color: transparent;
    color: var(--font-color);
    /* box-shadow: 0 2px 8px #e7dfd4; */
  }

  .post-images-wrapper {
    container-type: inline-size;
  }

  .main-post-container {
    
    padding: 10px 10px;
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
    border-radius: 2px;
  }

  .grid-thumbnail {
    flex: 1 1 calc(33.33% - 4px);
    height: calc(100cqi / 3);
    object-fit: cover;
    border-radius: 2px;
  }

  .odd-squares .grid-thumbnail {
    max-width: calc(33.33% - 4px);
  }

  .title-author-wc {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .post-title {
    font-size: larger;
    margin-bottom: 2px;
    font-weight: bold;
    flex: 1;
    min-width: 0;
  }

  .post-author {
    font-style: italic;
    margin-top: 0px;
  }

  .post-wc {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .post-summary {
    white-space: pre-line;
    margin-top: 0px;
  }

  .post-tag {
    font-family: var(--font);
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
    font-weight: bold;
  }

  .series-container {
    
    border-top: 1px solid var(--border-color);
  }

  .expand-container {
    padding: 10px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
  }

  .series-parts-p {
    margin: 0px 0px;
    font-size: large;
    padding: 0px 0px;
  }

  .series-expand-button {
    padding: 6px 10px;
  }

  .series-chapter-container {
    cursor: pointer;
    padding: 10px 10px;
    border-top: 1px solid var(--border-color);
  }

  .series-chapter-container:hover {
    background-color: var(--hover-color);
  }

  .series-chapter-text {
    cursor: pointer;
    margin: 0px;
    padding: 2px 0px 2px 15px;
  }

  .page-numbers {
    color: var(--font-color);
    padding: 10px 0px;
    margin: 0px
  }

  .nav-btns-container {
    display: flex;
    justify-content: center;
  }

  .nav-btns-container:last-child {
    margin-bottom: 20px;
  }

  .nav-prev-next-btn {
    font-family: var(--font);
    padding: 6px 10px;
    margin: 0px 6px;

  }

  .nav-prev-next-btn:disabled {
    cursor: default;
  }

  .nav-number-btn {
    border: none;
    background-color: rgba(0, 0, 0, 0);
    padding: 6px 10px;
    margin: 0px 2px;
    transition: background 0.1s;

  }

  .nav-number-btn.active {
    border: none;
    border-radius: 4px;
    background-color: var(--hover-color);

  }

  .nav-number-btn:hover {
    background-color: var(--hover-color);
    border: none;
    border-radius: 4px;
  }

  .nav-ellipsis {

    font-family: var(--font);
    color: var(--font-color);
    user-select: none;
  }

  .nav-top-btn {
    padding: 6px 10px;
    margin-left: 2px;
  }



</style>
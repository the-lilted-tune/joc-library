<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import Papa from 'papaparse'

  //GOOGLE SHEETS PARSING
  //TUMBLR API FETCHING
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyAzSMI6_nkDmlFgbNpqpZUbjFvkEZLD0EqMjyh4fExl-T5pihDu89cyI3Tg77U-00-s6SvhXnnxLu/pub?gid=0&single=true&output=csv";

const characters = ref([]);
const wordCounts = ref([]);
const generalTags = ref([]);
const loading = ref(true);

const posts = ref([]);

//Using Papa library to parse
onMounted(async() => {
  //Google Sheets
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header:true });

  const rows = parsed.data;

  characters.value = rows.map(r => r['Character']?.trim()).filter(Boolean);
  wordCounts.value = rows.map(r => r['Word Count']?.trim()).filter(Boolean);
  generalTags.value = rows.map(r => r['General Tags']?.trim()).filter(Boolean);

  //Tumblr API
  const API_KEY = '0vx5SGdnaG4e7yOrnZlsYtjaZ7ENe87yomO4gTfX3SuNNBUb5d';
  const BLOG = 'the-lilted-tune.tumblr.com';
  const limit = 50;
  let offset = 0;
  let totalPosts = Infinity;

  while (offset < totalPosts) {
    const response = await fetch(
      `https://api.tumblr.com/v2/blog/${BLOG}/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}`
    )
    const json = await response.json()

    totalPosts = json.response.total_posts
    posts.value.push(...json.response.posts)
    offset += limit
  }

  loading.value = false
}
)

  //FILTER UI

//Dropdowns (Mutually Exclusive Categories)
const selectedCharacter = ref(null);
const selectedWordCount = ref(null);

//Multi-select General Tags
const selectedTags = ref([]);

function toggleTag(tag) {
  const index = selectedTags.value.indexOf(tag);
  //Not selected; add it
  if (index === -1) {
    selectedTags.value.push(tag);
  //Already selected; remove it
  } else {
    selectedTags.value.splice(index, 1)
  }
}

  //FILTER FUNCTIONALITY
const displayedPosts = computed(() => {
  return posts.value.filter(post => {
    if(selectedCharacter.value && !post.tags.includes(selectedCharacter.value)) {
      return false
    }

    if(selectedWordCount.value && !post.tags.includes(selectedWordCount.value)) {
      return false
    }

    if(selectedTags.value.length > 0) {
      const hasAny = selectedTags.value.some(tag => post.tags.includes(tag))
      if(!hasAny) return false
    }

    return true
  })
})

function getContent(post) {
  if (post.trail && post.trail.length > 0) {
    const last = post.trail[post.trail.length - 1]
    const div = document.createElement('div')
    div.innerHTML = last.content
    return div.textContent
  }
  return post.summary
}

</script>

<template>

  <!-- Character Dropdown -->
  <div>
    <label>Character: </label>
    <select v-model="selectedCharacter">
      <option :value="null">All</option>
      <option v-for="c in characters"
      :key="c"
      :value="c">
        {{ c }}
      </option>
    </select>
  </div>

  <!-- WordCount Dropdown -->
  <div>
    <label>Word Count: </label>
    <select v-model="selectedWordCount">
      <option :value="null">All</option>
      <option v-for="w in wordCounts"
      :key="w"
      :value="w">
        {{ w }}
      </option>
    </select>
  </div>

  <p>Selected character: {{ selectedCharacter }}</p>
  <p>Selected word count: {{ selectedWordCount }}</p>

  <!-- Multi select Buttons -->
  <div>
    <button
      v-for="tag in generalTags"
      :key="tag"
      :class="{ active: selectedTags.includes(tag) }"
      @click="toggleTag(tag);"
    >
      {{ tag }}
    </button>
  </div>

  <p>Selected tags: {{ selectedTags }}</p>

  <!-- Posts -->
  <p>Posts loaded: {{ posts.length }}</p>
  <div v-for="post in displayedPosts" :key="post.id">
    <a :href="post.post_url">{{ getContent(post) }}</a>
    <p>Tags: {{ post.tags }}</p>
  </div>

  <!-- <div v-for="post in displayedPosts" :key="post.id">
  <pre>{{ JSON.stringify(post, null, 2) }}</pre>
</div> -->
</template>

<style scoped>
  button {
    padding: 6px 12px;
    margin: 4px;
    cursor: pointer;
  }

  button.active {
    background-color:cornflowerblue;
    color:white;
  }
</style>

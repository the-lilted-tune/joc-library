import { computed } from 'vue';


export function useReblogContents(wcPrefix, paginatedPosts, getImages, expandedSeries) {
  function getParagraphs(post) {
    const last = post.trail[post.trail.length - 1];
    const div = document.createElement('div');
    div.innerHTML = last.content;
    const paragraphs = div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');

    return Array.from(paragraphs).filter(p => p.textContent?.trim())

  }

  function getWordCount(post) {
    const tag = post.tags.find(t => t.startsWith(wcPrefix));
    return tag ? tag.slice(wcPrefix.length).trim() : null;
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
          isThree,
          wordCount: getWordCount(dp),
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
              isThree: false,
              wordCount: null,
            }
          }
        })
      }
    })
    return map
  })

  return {
    postContent
  }
}
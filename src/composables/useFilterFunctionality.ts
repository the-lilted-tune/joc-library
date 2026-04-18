import { computed } from 'vue';

export function useFilterFunctionality(appliedDropdowns, appliedTagStates, expandedSeries, selectedDropdowns, tagStates, currentPage, dropdownCategories, getSeriesName, seriesOrderMap, posts, masterlistPrefix) {
    //FILTER FUNCTIONALITY
  
  


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

      if (tags.includes('not a fic')) {
        return false
      }

      return true;
    });
  });

  const groupedPosts = computed(() => {
    const seriesMap: Record<string, { name: string, posts: any[], mainPost: any }> = {};
    const result: any[] = [];
    const seriesInserted = new Set();

    posts.value.forEach(post => {
      const seriesNames = getSeriesName(post);
      
        if (!seriesNames) {
        result.push({ type: 'standalone', post });
        return;
      }

      for (let i = 0; i < seriesNames.length; i++) {
        if (!seriesMap[seriesNames[i]]) {
          seriesMap[seriesNames[i]] = { name: seriesNames[i], posts: [], mainPost: null };
        }
        seriesMap[seriesNames[i]].posts.push(post);

        if (!seriesInserted.has(seriesNames[i])) {
          result.push({ type: 'series', series: seriesMap[seriesNames[i]] });
          seriesInserted.add(seriesNames[i]);
        }
      }
    });

    Object.values(seriesMap).forEach(s => {
      s.posts.sort((a, b) => getOriginalTimestamp(a) - getOriginalTimestamp(b));

      const order = seriesOrderMap.value[s.name];
      if (order) {
        const original = [...s.posts];
        const reordered: any[] = [];

        order.forEach(pos => {
          if (pos >= 1 && pos <= original.length) {
            reordered.push(original[pos - 1]);
          }
        });

        original.forEach((post, i) => {
          if (!order.includes(i + 1)) {
            reordered.push(post);
          }
        });

        s.posts.splice(0, s.posts.length, ...reordered);
      }

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

  function getOriginalTimestamp(post) {
    if (post.trail && post.trail[0]?.post?.id) {
      return parseInt(post.trail[0].post.id);
    }
    return post.timestamp;
  }

  return {
    applyFilters, clearFilters,
    filteredPosts, groupedPosts
  };
}
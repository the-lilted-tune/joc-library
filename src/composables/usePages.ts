import { computed } from 'vue';

export function usePages(POSTS_PER_PAGE, filteredPosts, currentPage) {

  //PAGES
  // const currentPage = ref(1);
  

  const totalPages = computed(() => {
    return Math.ceil(filteredPosts.value.length / POSTS_PER_PAGE)
  });

  const paginatedPosts = computed(() => {
    const start = (currentPage.value - 1) * POSTS_PER_PAGE;
    return filteredPosts.value.slice(start, start + POSTS_PER_PAGE);
  })

  const visiblePages = computed(() => {
    const total = totalPages.value;
    const current = currentPage.value;
    const pages: (number | '...')[] = [];

    if (total <= 8) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (current > 3) pages.push('...');

    // Pages around current
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 3) pages.push('...');

    // Always show last page
    pages.push(total);

    return pages;
  });


  function scrollToTop() {
    const el = document.getElementById('posts-top');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  return {
    totalPages,
    paginatedPosts,
    visiblePages,
    scrollToTop
  }
}
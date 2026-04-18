export async function useOnMounted(API_KEY, BLOG, loading, dropdownCategories, characterSources, hiddenColumns, dropdownOptions, tagCategories, explicitPrefix, seriesOrderMap, posts, openDropdown, rows, headers, orderParsed, orderMap) {
  //GOOGLE SHEETS
  characterSources.value = {};
  rows.forEach(r => {
    const name = r['Character']?.trim();
    const source = r['Character Source']?.trim();
    if (name && source) characterSources.value[name] = source;
  });

  dropdownCategories.forEach(cat => {
    dropdownOptions.value[cat] = rows.map(r => r[cat]?.trim()).filter(Boolean);
  });

  headers.forEach(header => {
    const trimmed = header.trim();
    if (dropdownCategories.includes(trimmed)) return;
    if (hiddenColumns.includes(trimmed)) return;
    // removed the duplicate dropdownCategories check you had

    const isExplicit = trimmed.startsWith(explicitPrefix);
    const displayName = isExplicit ? trimmed.slice(explicitPrefix.length).trim() : trimmed;

    tagCategories.value[displayName] = {
      tags: rows.map(r => r[header]?.trim()).filter(Boolean),
      explicitOnly: isExplicit
    };
  });

  //SERIES ORDER OVERRIDE
  orderParsed.data.forEach(row => {
    const series = row['Series Name']?.trim();
    const order = row['Order']?.trim();
    if (series && order) {
      orderMap[series] = order.split(',').map(n => parseInt(n.trim()));
    }
  });
  seriesOrderMap.value = orderMap;

  // TUMBLR API (added cache and parallel 4/17/2026)
  const limit = 50;
  const CACHE_KEY = `tumblr_posts_${BLOG}`;
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        posts.value = data;
        loading.value = false;
      }
    }
  } catch {}

  const buildUrl = (offset) =>
    `https://api.tumblr.com/v2/blog/${BLOG}.tumblr.com/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}`;

  try {
    const firstResp = await fetch(buildUrl(0));
    const firstJson = await firstResp.json();
    const totalPosts = firstJson.response.total_posts;
    const firstBatch = firstJson.response.posts;

    if (!posts.value.length) {
      posts.value = [...firstBatch];
      loading.value = false;
    }

    const requests = [];
    for (let offset = limit; offset < totalPosts; offset += limit) {
      requests.push(
        fetch(buildUrl(offset))
          .then(r => r.json())
          .then(j => j.response.posts)
          .catch(err => {
            console.error('Failed at offset', offset, err);
            return [];
          })
      );
    }

    const remaining = await Promise.all(requests);
    const allPosts = [...firstBatch, ...remaining.flat()];
    posts.value = allPosts;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: allPosts
      }));
    } catch {
    }
  } catch (err) {
    console.error('Failed to fetch Tumblr posts', err);
  }

  loading.value = false;

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.dropdown')) {
      openDropdown.value = null;
    }
  });
}

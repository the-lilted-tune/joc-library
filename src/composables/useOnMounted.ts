async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (json.meta?.status && json.meta.status >= 400) {
        throw new Error(`Tumblr API ${json.meta.status}: ${json.meta.msg}`);
      }
      return json;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
    }
  }
}

async function runInBatches<T>(
  tasks: (() => Promise<T>)[],
  batchSize = 4
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => t()));
    results.push(...batchResults);
  }
  return results;
}

export async function useOnMounted(API_KEY, BLOG, loading, dropdownCategories, characterSources, hiddenColumns, dropdownOptions, tagCategories, explicitPrefix, seriesOrderMap, posts, openDropdown, rows, headers, orderParsed, orderMap, authors) {
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
  const CACHE_TTL = 10 * 60 * 1000;

  // Show cached data instantly
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

  const buildUrl = (offset: number) =>
    `https://api.tumblr.com/v2/blog/${BLOG}.tumblr.com/posts?api_key=${API_KEY}&limit=${limit}&offset=${offset}`;

  let firstJson;
  try {
    firstJson = await fetchWithRetry(buildUrl(0));
  } catch (err) {
    console.error('Initial fetch failed', err);
    loading.value = false;
    return;
  }

  const totalPosts = firstJson.response.total_posts;
  const firstBatch = firstJson.response.posts;

  if (!posts.value.length) {
    posts.value = [...firstBatch];
    loading.value = false;
  }

  const tasks: (() => Promise<any[] | null>)[] = [];
  for (let offset = limit; offset < totalPosts; offset += limit) {
    tasks.push(() =>
      fetchWithRetry(buildUrl(offset))
        .then(j => j.response.posts)
        .catch(err => {
          console.error('Gave up on offset', offset, err);
          return null;
        })
    );
  }

  const remaining = await runInBatches(tasks, 4);

  const failedCount = remaining.filter(r => r === null).length;
  const successfulPages = remaining.filter(r => r !== null) as any[][];
  const allPosts = [...firstBatch, ...successfulPages.flat()];

  posts.value = allPosts;
  loading.value = false;

  if (failedCount === 0) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: allPosts
      }));
    } catch {}
  }

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.dropdown')) {
      openDropdown.value = null;
    }
  });

  const authorSet = new Set<string>();
  posts.value.forEach(post => {
    const author = post.trail?.[0]?.blog?.name;
    if (author === 'jocficlibrary') return;
    if (author) authorSet.add(author);
  });
  authors.value = Array.from(authorSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

}

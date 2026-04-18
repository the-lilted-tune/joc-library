

export async function useOnMounted(API_KEY, BLOG, loading, dropdownCategories, characterSources, hiddenColumns, dropdownOptions, tagCategories, explicitPrefix, seriesOrderMap, posts, openDropdown, rows, headers, orderParsed, orderMap) {
//Using Papa library to parse
  //Google Sheets
  characterSources.value = {};
  rows.forEach(r => {
    const name = r['Character']?.trim();
    const source = r['Character Source']?.trim();
    if (name && source) {
      characterSources.value[name] = source;
    }
  });

  dropdownCategories.forEach(cat => {
    dropdownOptions.value[cat] = rows
      .map(r => r[cat]?.trim())
      .filter(Boolean);
  });

  headers.forEach(header => {
    const trimmed = header.trim();
    if (dropdownCategories.includes(trimmed)) return;
    if (hiddenColumns.includes(trimmed)) return;
    if (dropdownCategories.includes(trimmed)) return;

    const isExplicit = trimmed.startsWith(explicitPrefix);
    const displayName = isExplicit
      ? trimmed.slice(explicitPrefix.length).trim()
      : trimmed;

    tagCategories.value[displayName] = {
      tags: rows.map(r => r[header]?.trim()).filter(Boolean),
      explicitOnly: isExplicit
    };
  });

  //Series Order Override
  
  orderParsed.data.forEach(row => {
    const series = row['Series Name']?.trim();
    const order = row['Order']?.trim();
    if (series && order) {
      orderMap[series] = order.split(',').map(n => parseInt(n.trim()));
    }
  });
  seriesOrderMap.value = orderMap;

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
  
  loading.value = false;

  //Handling if click is outside dropdown
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.dropdown')) {
      openDropdown.value = null;
    }
  });
}

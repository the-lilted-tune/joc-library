

export function useSeriesFunctionality(seriesPrefix, masterlistPrefix) {
  function getSeriesName(post) {
    const seriesTags = post.tags
      .filter(t => t.startsWith(seriesPrefix) || t.startsWith(masterlistPrefix))
      .map(tag => {
        if (tag.startsWith(seriesPrefix)) return tag.slice(seriesPrefix.length).trim();
        return tag.slice(masterlistPrefix.length).trim();
      });
    return seriesTags.length > 0 ? seriesTags : null;
    
  }

  function getNumberOfParts(item) {
    return item.series.posts.length - (item.series.mainPost.tags.some(t => t.startsWith(masterlistPrefix)) ? 1 : 0)
  }

  return {
    getSeriesName,
    getNumberOfParts
  }
}
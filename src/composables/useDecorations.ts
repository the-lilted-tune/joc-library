

export function useDecorations(dropdownCategories, appliedDropdowns, appliedTagStates, characterSources) {
    //TAG HIGHLIGHTING
  function getTagClass(tag) {
    for (const cat of dropdownCategories) {
      if(appliedDropdowns.value[cat] === tag) return 'highlight-text';
    }
    
    const state = appliedTagStates.value[tag]
    if (state) return 'highlight-text'
    
    return ''
  }

    //LINK TO TUMBLR
    function openPost(url) {
      window.open(url, '_blank');
  }

  //DISPLAY CHARACTER NAMES
  function capitalize(str) {
    return str.split(' ').map(word => word[0].toUpperCase() + word.slice(1)).join(' ').split("'").map(word => word[0].toUpperCase() + word.slice(1)).join("'");
  }

  function formatTag(tag) {
    const source = characterSources.value[tag];
    if (source) {
      return `${capitalize(tag)} (${source})`;
    }
    return tag;
  }

  return {
    getTagClass,
    openPost,
    capitalize,
    formatTag
  }
}
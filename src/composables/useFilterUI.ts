export function useFilterUI(selectedDropdowns, openDropdown, tagStates, expandedCategories) {
  //FILTER UI
    //Dropdowns
  

  function toggleDropdown(cat) {
    openDropdown.value = openDropdown.value === cat ? null : cat;
  }

  function selectOption(cat, value) {
    selectedDropdowns.value[cat] = value;
    openDropdown.value = null;
  }

    //Multi-select tags
  

  function toggleExpand(category: string) {
    expandedCategories.value[category] = !expandedCategories.value[category];
  }

  function cycleTag(tag) {
    const current = tagStates.value[tag];
    const newState = {...tagStates.value};

    if (!current) {
      newState[tag] = 'include';
    } else if (current === 'include') {
      newState[tag] = 'exclude';
    } else {
      delete newState[tag];
    }

    tagStates.value = newState;
  }

  

  return {
    toggleDropdown, 
    selectOption,
    toggleExpand, 
    cycleTag
  };
}

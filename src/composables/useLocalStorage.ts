

export function useLocalStorage(selectedDropdowns, tagStates, appliedDropdowns, appliedTagStates) {
   //LOCAL STORAGE
function loadSavedFilters() {
  try {
    const saved = localStorage.getItem('filters');
    if (!saved) return;
    const data = JSON.parse(saved);
    selectedDropdowns.value = data.dropdowns || {};
    tagStates.value = data.tagStates || {};
    appliedDropdowns.value = { ...(data.dropdowns || {}) };
    appliedTagStates.value = { ...(data.tagStates || {}) };
  } catch {
    // Storage not available
  }
}

return loadSavedFilters;

}
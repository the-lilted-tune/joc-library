

export function useThemes(lightMode) {
  function toggleTheme() {
    lightMode.value = !lightMode.value;
    const theme = lightMode.value ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  return toggleTheme
}
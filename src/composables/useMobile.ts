

export function useMobile() {
    //MOBILE STUFF
  let touchStartY = 0;

  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e, url) {
    const diff = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (diff < 5) {
      window.open(url, '_blank');
    }
  }
  return {
    handleTouchStart,
    handleTouchEnd
  }
}
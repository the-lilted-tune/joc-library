

export function useImages() {
    //IMAGES
  function getImages(post) {
    const div = document.createElement('div')
    div.innerHTML = post.trail[0].content_raw

    const images = div.querySelectorAll('img')
    const results = []

    for (const img of images) {
      const width = parseInt(img.getAttribute('data-orig-width'))
      const height = parseInt(img.getAttribute('data-orig-height'))
      
      results.push({
          src: img.src,
          type: (width / height) < 1.8 ? 'square' : 'wide'
      })
    }

    const squareCount = (results.filter(img => img.type === 'square').length)
    if (squareCount === 1) {
      results[0].type = 'wide'
    }

    return {
      images: results,
      isThree: squareCount % 3 === 0
    }
  }

  function retryImage(event) {
    const img = event.target;
    const retries = parseInt(img.dataset.retries || '0');
    if (retries < 3) {
      img.dataset.retries = String(retries + 1);
      setTimeout(() => {
        img.src = img.src;
      }, 1000 * (retries + 1));
    }
  }

  return {
    getImages,
    retryImage
  }
}
/**
 * Warm planet texture bytes during the preloader so ContinuumCanvas
 * mounts on already-cached 8K masters (desktop) / 2K (mobile).
 */
const IMAGE_CACHE = new Map()

function loadImage(url) {
  if (!url) return Promise.resolve(null)
  if (IMAGE_CACHE.has(url)) return IMAGE_CACHE.get(url)
  const job = new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to preload ${url}`))
    img.src = url
  }).catch((err) => {
    IMAGE_CACHE.delete(url)
    console.warn('[SilentFleet]', err?.message || err)
    return null
  })
  IMAGE_CACHE.set(url, job)
  return job
}

export function planetTextureUrls(mobile = false) {
  if (mobile) {
    return [
      '/textures/moon_color_2k.jpg',
      '/textures/moon_height_2k.jpg',
      '/textures/mars_color_2k.jpg',
      '/textures/mars_bump_2k.jpg',
    ]
  }
  return [
    '/textures/moon_color_8k.jpg',
    '/textures/moon_height_4k.jpg',
    '/textures/mars_color_8k.jpg',
    '/textures/mars_bump_4k.jpg',
  ]
}

/** Critical path for first hero frame — Moon only (Mars can finish after enter). */
export function criticalMoonUrls(mobile = false) {
  if (mobile) {
    return ['/textures/moon_color_2k.jpg', '/textures/moon_height_2k.jpg']
  }
  return ['/textures/moon_color_8k.jpg', '/textures/moon_height_4k.jpg']
}

export function preloadPlanetTextures(mobile = false) {
  return Promise.all(planetTextureUrls(mobile).map(loadImage))
}

export function preloadCriticalMoon(mobile = false) {
  return Promise.all(criticalMoonUrls(mobile).map(loadImage))
}

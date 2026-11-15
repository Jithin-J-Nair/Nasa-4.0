/**
 * Warm planet textures during the preloader so ContinuumCanvas / useTexture
 * can hit THREE.Cache and the browser HTTP cache on first paint.
 */
import * as THREE from 'three'

THREE.Cache.enabled = true

const JOBS = new Map()

function loadTexture(url) {
  if (!url) return Promise.resolve(null)
  if (JOBS.has(url)) return JOBS.get(url)

  const job = new Promise((resolve) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (tex) => {
        // Keep in THREE.Cache via loader; also pin the image in HTTP memory
        tex.colorSpace = url.includes('height') || url.includes('bump')
          ? THREE.NoColorSpace
          : THREE.SRGBColorSpace
        resolve(tex)
      },
      undefined,
      (err) => {
        console.warn('[SilentFleet] texture preload failed', url, err)
        JOBS.delete(url)
        resolve(null)
      },
    )
  })

  JOBS.set(url, job)
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
    '/textures/moon_color_4k.jpg',
    '/textures/moon_height_4k.jpg',
    '/textures/mars_color_4k.jpg',
    '/textures/mars_bump_4k.jpg',
  ]
}

/** Critical path for first hero frame — Moon only. */
export function criticalMoonUrls(mobile = false) {
  if (mobile) {
    return ['/textures/moon_color_2k.jpg', '/textures/moon_height_2k.jpg']
  }
  return ['/textures/moon_color_4k.jpg', '/textures/moon_height_4k.jpg']
}

export function preloadPlanetTextures(mobile = false) {
  return Promise.all(planetTextureUrls(mobile).map(loadTexture))
}

export function preloadCriticalMoon(mobile = false) {
  return Promise.all(criticalMoonUrls(mobile).map(loadTexture))
}

/** Warm the lazy ContinuumCanvas chunk in parallel with textures. */
export function preloadContinuumModule() {
  return import('./ContinuumCanvas')
}

/** Keep Mars + Voyager warm so Journey / Silence never open on an empty stage. */
export function preloadMarsAndVoyager(mobile = false) {
  const urls = mobile
    ? ['/textures/mars_color_2k.jpg', '/textures/mars_bump_2k.jpg']
    : ['/textures/mars_color_4k.jpg', '/textures/mars_bump_4k.jpg']
  const textures = Promise.all(urls.map(loadTexture))
  const craft = fetch('/models/Voyager.glb', { mode: 'cors', credentials: 'omit' })
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null)
  return Promise.all([textures, craft])
}

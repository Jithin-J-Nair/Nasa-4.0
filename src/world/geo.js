/**
 * Geographic helpers — Mean Earth / Polar Axis (Moon) and planetocentric east lon (Mars).
 * Positions match Three.js SphereGeometry UV after BodySphere baseYaw (−π/2):
 * lon 0° faces +Z (camera-forward for our hero framing).
 */

export function latLonToLocal(lat, lon, radius = 1.008) {
  const φ = (Number(lat) * Math.PI) / 180
  const λ = (Number(lon) * Math.PI) / 180
  const cosφ = Math.cos(φ)
  return [
    radius * cosφ * Math.sin(λ),
    radius * Math.sin(φ),
    radius * cosφ * Math.cos(λ),
  ]
}

/** Orthographic nearside disc (Moon facing Earth) — for 2D map UI */
export function nearsideXY(lat, lon, { pad = 6 } = {}) {
  const φ = (lat * Math.PI) / 180
  const λ = (lon * Math.PI) / 180
  const x = 50 + Math.cos(φ) * Math.sin(λ) * (50 - pad)
  const y = 50 - Math.sin(φ) * (50 - pad)
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
  return {
    left: `${clamp(x, pad, 100 - pad)}%`,
    top: `${clamp(y, pad, 100 - pad)}%`,
    visible: Math.cos(φ) * Math.cos(λ) > -0.05, // foreside / limb
  }
}

/** Simple equirectangular for Mars map UI (lon −180…180, lat −90…90) */
export function equirectXY(lat, lon, { pad = 4 } = {}) {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
  const x = ((Number(lon) + 180) / 360) * 100
  const y = ((90 - Number(lat)) / 180) * 100
  return {
    left: `${clamp(x, pad, 100 - pad)}%`,
    top: `${clamp(y, pad, 100 - pad)}%`,
    visible: true,
  }
}

export const SITE_FOCUS = {
  'a11-lm': { body: 'moon', aimLon: 23.47, aimLat: 0.67 },
  opportunity: { body: 'mars', aimLon: -5.5, aimLat: -2.28 },
  pioneer10: { body: 'deep' },
  voyager1: { body: 'deep' },
}

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

/** Film tip held while Atlas is on screen — gentle centered zoom, site facing lens. */
export const ATLAS_HOLD_PROGRESS = 0.20

/** Aim targets — NSSDC / LROC Mean Earth–Polar Axis (match artifacts.js lat/lon). */
export const SITE_FOCUS = {
  'a11-lm': { body: 'moon', aimLon: 23.47314, aimLat: 0.67416 },
  'a12-alsep': { body: 'moon', aimLon: -23.4249, aimLat: -3.0098 },
  surveyor3: { body: 'moon', aimLon: -23.418, aimLat: -3.0162 },
  'a14-alsep': { body: 'moon', aimLon: -17.47768, aimLat: -3.64419 },
  'a15-lrv': { body: 'moon', aimLon: 3.63803, aimLat: 26.13174 },
  'a16-lrv': { body: 'moon', aimLon: 15.5037, aimLat: -8.9729 },
  'a17-lrv': { body: 'moon', aimLon: 30.7769, aimLat: 20.1896 },
  'a11-lrrr': { body: 'moon', aimLon: 23.47307, aimLat: 0.67345 },
  opportunity: { body: 'mars', aimLon: -5.5043, aimLat: -2.2795 },
  spirit: { body: 'mars', aimLon: 175.4726, aimLat: -14.5684 },
  phoenix: { body: 'mars', aimLon: -125.7492, aimLat: 68.2188 },
  insight: { body: 'mars', aimLon: 135.6234, aimLat: 4.5024 },
  sojourner: { body: 'mars', aimLon: -33.22, aimLat: 19.13 },
  pioneer10: { body: 'deep' },
  voyager1: { body: 'deep' },
}


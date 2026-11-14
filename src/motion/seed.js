/**
 * Session seed — reloads produce slightly different animation timings / offsets.
 * Narrative stays fixed; motion improvises around it.
 */

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const KEY = 'sf-session-seed'
let cached = null

export function getSessionSeed() {
  if (cached != null) return cached
  try {
    const existing = sessionStorage.getItem(KEY)
    if (existing) {
      cached = Number(existing) || Date.now()
      return cached
    }
  } catch { /* ignore */ }
  const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0
  try { sessionStorage.setItem(KEY, String(seed)) } catch { /* ignore */ }
  cached = seed
  return seed
}

/** Deterministic 0–1 from seed + salt */
export function rand(salt = 0) {
  const s = getSessionSeed()
  const n = hash(`${s}:${salt}`)
  return (n % 10000) / 10000
}

export function ranged(min, max, salt = 0) {
  return min + (max - min) * rand(salt)
}

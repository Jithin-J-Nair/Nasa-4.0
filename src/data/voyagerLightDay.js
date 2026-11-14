/**
 * Voyager 1 · one light-day from Earth
 * NASA milestone: Wed 18 Nov 2026, 10:16:07 UTC
 * @see https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/
 */
export const VOYAGER_LIGHT_DAY = {
  /** Instant Voyager 1 reaches ~16.094e9 mi / 25.902e9 km (1 light-day). */
  atMs: Date.parse('2026-11-18T10:16:07.000Z'),
  iso: '2026-11-18T10:16:07.000Z',
  label: '1 light-day from Earth',
  distanceMi: '16.094 billion miles',
  distanceKm: '25.902 billion kilometers',
  au: '173.14 AU',
  source: 'https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/',
  shineBright: 'https://go.nasa.gov/shinebright',
}

/** Live remaining time until (or since) the light-day tip. */
export function lightDayRemaining(nowMs = Date.now()) {
  const delta = VOYAGER_LIGHT_DAY.atMs - nowMs
  const past = delta <= 0
  const abs = Math.abs(delta)
  const totalSec = Math.floor(abs / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const ms = abs % 1000
  return { past, days, hours, minutes, seconds, ms, totalMs: abs }
}

export function pad2(n) {
  return String(Math.max(0, n | 0)).padStart(2, '0')
}

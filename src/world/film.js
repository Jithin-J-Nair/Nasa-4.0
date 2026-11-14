/**
 * FilmDirector — directed beats, not keyframe lerps.
 * Holds you feel. Smash that hurts. Darkness as punctuation.
 */

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }
export function lerp(a, b, t) { return a + (b - a) * t }

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
export function easeInQuart(t) { return t * t * t * t }
export function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }
export function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

/** Flat plateaus = cinematic hold you feel in the body */
export function easeHold(t, hold = 0.42) {
  if (t < hold) return 0
  if (t > 1 - hold * 0.55) return 1
  return easeInOutCubic((t - hold) / (1 - hold * 1.55))
}

/**
 * Signature acts. Each owns camera, grade, diegetic event intensity,
 * darkness, fog, and a sound cue id for scored silence.
 */
export const ACTS = [
  {
    id: 'hero',
    label: 'ARRIVAL',
    range: [0.0, 0.10],
    ease: easeHold,
    // Moon dead-center — equal starfield both limbs
    cam: { from: [0, 0.02, 6.8], to: [0, 0.02, 6.4], look: [0, 0, 0], fov: [36, 34] },
    grade: { lift: [0.01, 0.015, 0.04], gain: [1.05, 1.06, 1.1], exposure: 1.12, grain: 0.028 },
    event: { dive: 0, storm: 0, carrier: 0, warp: 0.02 },
    dark: 0,
    fog: [24, 100],
    focus: 'moon',
    cue: 'arrive',
  },
  {
    id: 'intimacy',
    label: 'NEAR SIDE',
    range: [0.10, 0.22],
    ease: easeInOutCubic,
    // Slight centered zoom only — limbs stay visible both sides
    cam: { from: [0, 0.02, 6.4], to: [0, 0.02, 5.35], look: [0, 0, 0], fov: [34, 32] },
    grade: { lift: [0.015, 0.02, 0.045], gain: [1.04, 1.05, 1.1], exposure: 1.02, grain: 0.04 },
    event: { dive: 0, storm: 0, carrier: 0, warp: 0.06 },
    dark: 0.04,
    fog: [20, 90],
    focus: 'moon',
    cue: 'near',
    hotspot: 'a11-lm',
  },
  {
    // Close lunar pass on the globe only — no local mesh floor / crater plane
    id: 'crater_dive',
    label: 'NEAR PASS',
    range: [0.22, 0.36],
    ease: easeInQuart,
    cam: { from: [0, 0.02, 5.35], to: [0, 0.02, 3.55], look: [0, 0, 0], fov: [32, 28] },
    grade: { lift: [0.02, 0.025, 0.045], gain: [0.95, 0.97, 1.02], exposure: 0.92, grain: 0.06 },
    event: { dive: 0.55, storm: 0, carrier: 0, warp: 0.35 },
    dark: 0.18,
    fog: [14, 70],
    focus: 'moon',
    smash: 0.335,
    cue: 'dive',
  },
  {
    id: 'mars',
    label: 'MERIDIANI',
    range: [0.36, 0.50],
    ease: easeOutExpo,
    cam: { from: [3.05, 0.62, 5.1], to: [2.55, 0.22, 3.05], look: [2.72, 0.1, -0.45], fov: [50, 32] },
    grade: { lift: [0.09, 0.03, 0.01], gain: [1.22, 0.92, 0.72], exposure: 1.1, grain: 0.06 },
    event: { dive: 0, storm: 0.04, carrier: 0, warp: 0.18 },
    dark: 0.08,
    fog: [10, 48],
    focus: 'mars',
    cue: 'mars',
    hotspot: 'opportunity',
  },
  {
    id: 'dust_storm',
    label: 'DUST STORM',
    range: [0.50, 0.66],
    ease: easeInOutQuint,
    cam: { from: [2.55, 0.22, 3.05], to: [2.15, 0.55, 1.85], look: [2.45, 0.12, -0.2], fov: [32, 24] },
    grade: { lift: [0.14, 0.05, 0.01], gain: [1.45, 0.55, 0.28], exposure: 0.28, grain: 0.28 },
    event: { dive: 0, storm: 1, carrier: 0, warp: 0.45 },
    dark: 0.92,
    fog: [1.4, 6.5],
    focus: 'storm',
    cue: 'opportunity_death',
    hotspot: 'opportunity',
  },
  {
    id: 'carrier',
    label: 'CARRIER',
    range: [0.66, 0.84],
    ease: easeInOutCubic,
    cam: { from: [0.55, 0.55, 7.2], to: [0.12, 0.22, 4.6], look: [0, 0.08, -9.2], fov: [42, 32] },
    grade: { lift: [0.01, 0.02, 0.055], gain: [0.88, 0.94, 1.18], exposure: 0.88, grain: 0.07 },
    event: { dive: 0, storm: 0, carrier: 0.55, warp: 0.15 },
    dark: 0.35,
    fog: [16, 80],
    focus: 'pioneer',
    cue: 'carrier',
    hotspot: 'pioneer10',
  },
  {
    id: 'silence',
    label: 'SILENCE',
    range: [0.84, 1.0],
    ease: easeHold,
    cam: { from: [0.12, 0.22, 4.6], to: [0.28, 0.18, 3.7], look: [0.04, 0.1, -9.5], fov: [32, 28] },
    grade: { lift: [0.01, 0.015, 0.035], gain: [0.9, 0.94, 1.05], exposure: 0.72, grain: 0.04 },
    event: { dive: 0, storm: 0, carrier: 1, warp: 0.05 },
    dark: 0.78,
    fog: [22, 95],
    focus: 'pioneer',
    cue: 'carrier_lost',
    hotspot: 'voyager1',
  },
]

export function sampleActs(progress) {
  const p = clamp(progress, 0, 1)
  let i = 0
  while (i < ACTS.length - 1 && p >= ACTS[i + 1].range[0]) i++
  const act = ACTS[i]
  const [a0, a1] = act.range
  const local = clamp((p - a0) / (a1 - a0), 0, 1)
  const e = act.ease(local)

  const cam = [
    lerp(act.cam.from[0], act.cam.to[0], e),
    lerp(act.cam.from[1], act.cam.to[1], e),
    lerp(act.cam.from[2], act.cam.to[2], e),
  ]
  const fov = lerp(act.cam.fov[0], act.cam.fov[1], e)
  const look = act.cam.look

  let grade = { ...act.grade }
  let event = { ...act.event }
  let dark = act.dark
  let fogNear = act.fog[0]
  let fogFar = act.fog[1]

  if (i < ACTS.length - 1) {
    const next = ACTS[i + 1]
    const edge = smoothstep(0.78, 1, local)
    grade = {
      lift: act.grade.lift.map((v, k) => lerp(v, next.grade.lift[k], edge)),
      gain: act.grade.gain.map((v, k) => lerp(v, next.grade.gain[k], edge)),
      exposure: lerp(act.grade.exposure, next.grade.exposure, edge),
      grain: lerp(act.grade.grain, next.grade.grain, edge),
    }
    event = {
      dive: lerp(act.event.dive, next.event.dive, edge),
      storm: lerp(act.event.storm, next.event.storm, edge),
      carrier: lerp(act.event.carrier, next.event.carrier, edge),
      warp: lerp(act.event.warp, next.event.warp, edge),
    }
    dark = lerp(act.dark, next.dark, edge)
    fogNear = lerp(act.fog[0], next.fog[0], edge)
    fogFar = lerp(act.fog[1], next.fog[1], edge)
  }

  // Near pass: gentle push on the globe — no local mesh bowl
  if (act.id === 'crater_dive') {
    const bowl = Math.sin(local * Math.PI)
    event.dive = Math.max(event.dive, bowl * 0.55)
    event.warp = Math.max(event.warp, bowl * 0.35)
    dark = Math.max(dark, bowl * 0.22)
  }
  // Storm: darkness owns the beat — Opportunity dying in the body
  if (act.id === 'dust_storm') {
    const smother = easeInOutQuint(local)
    event.storm = Math.max(event.storm, smother)
    dark = Math.max(dark, 0.55 + smother * 0.42)
    grade.exposure = Math.min(grade.exposure, lerp(0.55, 0.12, smother))
  }
  // Carrier: signal collapses into scored silence
  if (act.id === 'silence') {
    event.carrier = Math.max(event.carrier, easeHold(local, 0.25))
    dark = Math.max(dark, 0.55 + local * 0.35)
  }

  const smash = act.smash != null && Math.abs(p - act.smash) < 0.014

  return {
    index: i,
    act,
    local,
    eased: e,
    cam,
    look,
    fov,
    grade,
    fx: event, // alias for audio / legacy
    event,
    dark,
    fog: [fogNear, fogFar],
    focus: act.focus,
    label: act.label,
    cue: act.cue,
    hotspot: act.hotspot || null,
    smash,
  }
}

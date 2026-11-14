/**
 * FilmDirector — act-based scroll choreography.
 * Not a scrubber: holds, smash cuts, owned transition curves.
 */

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }
export function lerp(a, b, t) { return a + (b - a) * t }

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Cubic bezier approx (GSAP-style power curves) */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
export function easeInQuart(t) { return t * t * t * t }
export function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }
export function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}
export function easeHold(t, hold = 0.35) {
  // Flat middle = cinematic hold
  if (t < hold) return 0
  if (t > 1 - hold) return 1
  return easeInOutCubic((t - hold) / (1 - 2 * hold))
}

/**
 * Signature Silent Fleet acts (progress 0–1 of full page scroll).
 * Each act owns camera, grade, transition FX, audio cue.
 */
export const ACTS = [
  {
    id: 'hero',
    label: 'ARRIVAL',
    range: [0.0, 0.12],
    ease: easeHold,
    cam: { from: [0.55, 0.28, 6.4], to: [0.2, 0.18, 5.2], look: [0, 0.02, 0], fov: [42, 36] },
    grade: { lift: [0.02, 0.03, 0.06], gain: [1.0, 1.02, 1.08], exposure: 1.05, grain: 0.04 },
    fx: { dive: 0, storm: 0, carrier: 0, warp: 0.15 },
    focus: 'moon',
  },
  {
    id: 'intimacy',
    label: 'NEAR SIDE',
    range: [0.12, 0.26],
    ease: easeInOutCubic,
    cam: { from: [0.2, 0.18, 5.2], to: [-0.35, 0.12, 3.4], look: [0.15, 0, 0], fov: [36, 30] },
    grade: { lift: [0.02, 0.03, 0.055], gain: [1.02, 1.04, 1.1], exposure: 1.0, grain: 0.05 },
    fx: { dive: 0, storm: 0, carrier: 0, warp: 0.2 },
    focus: 'moon',
  },
  {
    id: 'crater_dive',
    label: 'CRATER DIVE',
    range: [0.26, 0.40],
    ease: easeInQuart, // accelerate into the surface
    cam: { from: [-0.35, 0.12, 3.4], to: [0.05, -0.05, 0.55], look: [0.1, 0, 0], fov: [30, 55] },
    grade: { lift: [0.04, 0.04, 0.05], gain: [0.85, 0.88, 0.9], exposure: 0.72, grain: 0.14 },
    fx: { dive: 1, storm: 0, carrier: 0, warp: 0.85 },
    focus: 'dive',
    smash: 0.38, // progress where cut punches through
  },
  {
    id: 'mars',
    label: 'MERIDIANI',
    range: [0.40, 0.55],
    ease: easeOutExpo, // smash emerge
    cam: { from: [2.9, 0.55, 4.8], to: [2.6, 0.28, 3.2], look: [2.75, 0.12, -0.4], fov: [48, 34] },
    grade: { lift: [0.08, 0.03, 0.01], gain: [1.18, 0.95, 0.78], exposure: 1.08, grain: 0.07 },
    fx: { dive: 0, storm: 0.05, carrier: 0, warp: 0.25 },
    focus: 'mars',
  },
  {
    id: 'dust_storm',
    label: 'DUST STORM',
    range: [0.55, 0.70],
    ease: easeInOutQuint,
    cam: { from: [2.6, 0.28, 3.2], to: [2.2, 0.9, 2.4], look: [2.5, 0.2, -0.3], fov: [34, 28] },
    grade: { lift: [0.12, 0.05, 0.01], gain: [1.35, 0.7, 0.4], exposure: 0.55, grain: 0.22 },
    fx: { dive: 0, storm: 1, carrier: 0, warp: 0.55 },
    focus: 'storm',
  },
  {
    id: 'carrier',
    label: 'CARRIER',
    range: [0.70, 0.86],
    ease: easeInOutCubic,
    cam: { from: [0.4, 0.5, 6.5], to: [0.15, 0.25, 4.8], look: [0, 0.1, -8.5], fov: [40, 34] },
    grade: { lift: [0.01, 0.02, 0.05], gain: [0.9, 0.95, 1.15], exposure: 0.92, grain: 0.08 },
    fx: { dive: 0, storm: 0, carrier: 0.6, warp: 0.2 },
    focus: 'pioneer',
  },
  {
    id: 'silence',
    label: 'SILENCE',
    range: [0.86, 1.0],
    ease: easeHold,
    cam: { from: [0.15, 0.25, 4.8], to: [0.35, 0.2, 3.9], look: [0.05, 0.12, -9], fov: [34, 30] },
    grade: { lift: [0.015, 0.02, 0.04], gain: [0.95, 0.98, 1.08], exposure: 1.0, grain: 0.05 },
    fx: { dive: 0, storm: 0, carrier: 1, warp: 0.1 },
    focus: 'pioneer',
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

  // Blend grade toward next act near boundary for continuity
  let grade = { ...act.grade }
  let fx = { ...act.fx }
  if (i < ACTS.length - 1) {
    const next = ACTS[i + 1]
    const edge = smoothstep(0.82, 1, local)
    grade = {
      lift: act.grade.lift.map((v, k) => lerp(v, next.grade.lift[k], edge)),
      gain: act.grade.gain.map((v, k) => lerp(v, next.grade.gain[k], edge)),
      exposure: lerp(act.grade.exposure, next.grade.exposure, edge),
      grain: lerp(act.grade.grain, next.grade.grain, edge),
    }
    fx = {
      dive: lerp(act.fx.dive, next.fx.dive, edge),
      storm: lerp(act.fx.storm, next.fx.storm, edge),
      carrier: lerp(act.fx.carrier, next.fx.carrier, edge),
      warp: lerp(act.fx.warp, next.fx.warp, edge),
    }
  }

  // Dive intensity peaks mid-act
  if (act.id === 'crater_dive') {
    fx.dive = Math.max(fx.dive, Math.sin(local * Math.PI))
  }
  if (act.id === 'dust_storm') {
    fx.storm = Math.max(fx.storm, easeInOutQuint(local))
  }

  return {
    index: i,
    act,
    local,
    eased: e,
    cam,
    look,
    fov,
    grade,
    fx,
    focus: act.focus,
    label: act.label,
    smash: act.smash != null && Math.abs(p - act.smash) < 0.012,
  }
}

/** Diegetic captions keyed to film progress — story lives with the camera */
export const WORLD_CAPTIONS = [
  { at: 0.04, until: 0.11, kicker: 'ACT I · LUNA', title: 'They stayed so we could learn.', body: '796 catalogued objects still sit on the Moon.' },
  { at: 0.14, until: 0.24, kicker: 'TRANQUILITY', title: 'Eagle never left.', body: 'Descent stage. LRRR still answers Earth’s lasers.' },
  { at: 0.28, until: 0.37, kicker: 'TRANSITION', title: 'Through the dust of one world…', body: 'Owned move: crater dive into the continuum.' },
  { at: 0.42, until: 0.52, kicker: 'ACT II · MARS', title: 'Meridiani remembers Opportunity.', body: '45.16 km. Hematite blueberries. Ancient water.' },
  { at: 0.56, until: 0.68, kicker: 'SOL 5111', title: 'My battery is low and it’s getting dark.', body: 'Feel the storm that ended the marathon.' },
  { at: 0.74, until: 0.84, kicker: 'ACT III · DEEP', title: 'Still outbound.', body: 'Pioneer 10 · plaque facing the dark.' },
  { at: 0.88, until: 0.98, kicker: 'CARRIER LOST', title: 'They are still out there.', body: 'Accuracy + connection. That was the brief.' },
]

export function activeCaption(progress) {
  const p = clamp(progress, 0, 1)
  return WORLD_CAPTIONS.find((c) => p >= c.at && p < c.until) || null
}

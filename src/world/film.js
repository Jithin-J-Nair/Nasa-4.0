/**
 * FilmDirector — directed beats, not keyframe lerps.
 * Holds you feel. Smash that hurts. Darkness as punctuation.
 * Journey: lunar zoom → void pullback → warp → Mars arrival.
 *
 * Phase 3: five hero SHOTS name the body feelings; ACTS still sample the continuum.
 */

/**
 * Grade bible — three looks a still frame can be identified by.
 * Acts/shots pick a lookId; sampler blends grade toward these presets.
 */
export const LOOKS = {
  lunar_steel: {
    lift: [0.01, 0.018, 0.048],
    gain: [1.02, 1.06, 1.14],
    exposure: 1.08,
    grain: 0.03,
  },
  meridiani_iron: {
    lift: [0.1, 0.032, 0.008],
    gain: [1.28, 0.88, 0.62],
    exposure: 1.06,
    grain: 0.055,
  },
  void: {
    lift: [0.008, 0.012, 0.04],
    gain: [0.86, 0.92, 1.12],
    exposure: 0.7,
    grain: 0.05,
  },
  last_light: {
    lift: [0.16, 0.04, 0.005],
    gain: [1.55, 0.42, 0.18],
    exposure: 0.14,
    grain: 0.42,
  },
}

/** Five owned seconds — damp owns how the body feels the camera. */
export const SHOTS = [
  {
    id: 'arrival', intent: 'hold', progress: 0.05, label: 'ARRIVAL',
    body: 'Moon centered — equal limbs', lookId: 'lunar_steel',
    damp: 0.055, fovDamp: 0.06,
  },
  {
    id: 'near_side', intent: 'push', progress: 0.155, label: 'NEAR SIDE',
    body: 'Atlas intimacy — surveyed sites', lookId: 'lunar_steel',
    damp: 0.042, fovDamp: 0.05,
  },
  {
    id: 'leave', intent: 'hold', progress: 0.30, label: 'JOURNEY',
    body: 'Lunar leave into corridor', lookId: 'lunar_steel',
    damp: 0.028, fovDamp: 0.032,
  },
  {
    id: 'meridiani', intent: 'recover', progress: 0.56, label: 'MERIDIANI',
    body: 'Right-limb settle — Opportunity', lookId: 'meridiani_iron',
    damp: 0.04, fovDamp: 0.045,
  },
  {
    id: 'last_light', intent: 'fail', progress: 0.70, label: 'LAST LIGHT',
    body: 'Storm eats exposure + chrome + score', lookId: 'last_light',
    damp: 0.14, fovDamp: 0.12,
  },
]

export function shotForProgress(p) {
  let best = SHOTS[0]
  let bestD = Infinity
  for (const s of SHOTS) {
    const d = Math.abs(p - s.progress)
    if (d < bestD) { best = s; bestD = d }
  }
  // Prefer last_light whenever inside dust_storm act
  if (p >= 0.64 && p < 0.76) return SHOTS.find((s) => s.id === 'last_light') || best
  if (p >= 0.52 && p < 0.64) return SHOTS.find((s) => s.id === 'meridiani') || best
  if (p >= 0.28 && p < 0.52) return SHOTS.find((s) => s.id === 'leave') || best
  if (p >= 0.09 && p < 0.28) return SHOTS.find((s) => s.id === 'near_side') || best
  return best
}

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
export function easeInOutCirc(t) {
  return t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2
}
/** Slow-in / long settle — cinematic camera moves */
export function easeCinematic(t) {
  const x = clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** Flat plateaus = cinematic hold you feel in the body */
export function easeHold(t, hold = 0.42) {
  if (t < hold) return 0
  if (t > 1 - hold * 0.55) return 1
  return easeInOutCubic((t - hold) / (1 - hold * 1.55))
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/**
 * Multi-keyframe sampler — phase keys are 0..1 within an act.
 * Uses cinematic ease between knots so forth/back scroll stays buttery.
 */
function samplePath(keys, local, easeFn = easeCinematic) {
  const t = clamp(local, 0, 1)
  if (t <= keys[0].t) {
    return {
      cam: keys[0].cam.slice(),
      look: keys[0].look.slice(),
      fov: keys[0].fov,
      phase: keys[0].phase || 0,
    }
  }
  const last = keys[keys.length - 1]
  if (t >= last.t) {
    return {
      cam: last.cam.slice(),
      look: last.look.slice(),
      fov: last.fov,
      phase: last.phase || 1,
    }
  }
  let i = 0
  while (i < keys.length - 1 && t > keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const u = easeFn((t - a.t) / Math.max(1e-5, b.t - a.t))
  return {
    cam: lerp3(a.cam, b.cam, u),
    look: lerp3(a.look, b.look, u),
    fov: lerp(a.fov, b.fov, u),
    phase: lerp(a.phase ?? 0, b.phase ?? 1, u),
  }
}

/**
 * JOURNEY path — continuous dolly/glide (no FOV or Z punch in/out).
 * Warp energy lives in star streaks + grade, not lens breathing.
 * phase: 0 lunar hold · 0.3 leave · 0.55 corridor · 0.8 mars grow · 1 lock
 */
const TRANSIT_KEYS = [
  // Match Atlas / near-side framing — soft lunar disc, no closer punch
  { t: 0.00, cam: [0, 0.02, 5.35], look: [0, 0, 0], fov: 33, phase: 0 },
  { t: 0.14, cam: [0.04, 0.05, 5.55], look: [0.08, 0.02, -0.55], fov: 33.5, phase: 0.12 },
  { t: 0.28, cam: [0.28, 0.12, 6.15], look: [0.45, 0.05, -1.8], fov: 34, phase: 0.28 },
  { t: 0.44, cam: [0.7, 0.2, 6.85], look: [1.15, 0.08, -3.6], fov: 34.5, phase: 0.48 },
  { t: 0.58, cam: [1.15, 0.22, 7.15], look: [1.7, 0.1, -4.2], fov: 34.5, phase: 0.62 },
  { t: 0.74, cam: [1.35, 0.18, 6.2], look: [1.95, 0.09, -1.8], fov: 34, phase: 0.78 },
  { t: 0.88, cam: [0.75, 0.12, 4.95], look: [1.45, 0.07, -0.55], fov: 33.5, phase: 0.9 },
  // Hand off: camera left, Mars right — ~50% body in frame
  { t: 1.00, cam: [0.55, 0.1, 4.7], look: [1.28, 0.06, -0.4], fov: 33, phase: 1 },
]

/**
 * Signature acts. Each owns camera, grade, diegetic event intensity,
 * darkness, fog, and a sound cue id for scored silence.
 */
export const ACTS = [
  {
    id: 'hero',
    label: 'ARRIVAL',
    range: [0.0, 0.09],
    ease: easeHold,
    // Moon dead-center — equal starfield both limbs
    cam: { from: [0, 0.02, 6.8], to: [0, 0.02, 6.4], look: [0, 0, 0], fov: [36, 34] },
    grade: { lift: [0.01, 0.015, 0.04], gain: [1.05, 1.06, 1.1], exposure: 1.12, grain: 0.028 },
    event: { dive: 0, storm: 0, carrier: 0, warp: 0.02 },
    dark: 0,
    fog: [24, 100],
    focus: 'moon',
    cue: 'arrive',
    // Front-face Eagle from the first frame — no free-spin limb drift
    hotspot: 'a11-lm',
    lookId: 'lunar_steel',
  },
  {
    id: 'intimacy',
    label: 'NEAR SIDE',
    range: [0.09, 0.18],
    ease: easeInOutCubic,
    // Slight centered zoom only — limbs stay visible both sides
    cam: { from: [0, 0.02, 6.4], to: [0, 0.02, 5.15], look: [0, 0, 0], fov: [34, 31] },
    grade: { lift: [0.015, 0.02, 0.045], gain: [1.04, 1.05, 1.1], exposure: 1.02, grain: 0.04 },
    event: { dive: 0, storm: 0, carrier: 0, warp: 0.06 },
    dark: 0.04,
    fog: [20, 90],
    focus: 'moon',
    cue: 'near',
    hotspot: 'a11-lm',
    lookId: 'lunar_steel',
  },
  {
    // Soft lunar settle before Journey — no smash zoom
    id: 'crater_dive',
    label: 'NEAR PASS',
    range: [0.18, 0.28],
    ease: easeInOutCubic,
    cam: { from: [0, 0.02, 5.15], to: [0, 0.02, 5.35], look: [0, 0, 0], fov: [31, 33] },
    grade: { lift: [0.02, 0.025, 0.045], gain: [0.98, 1.0, 1.05], exposure: 0.98, grain: 0.05 },
    event: { dive: 0.22, storm: 0, carrier: 0, warp: 0.12 },
    dark: 0.1,
    fog: [16, 78],
    focus: 'moon',
    cue: 'dive',
    lookId: 'lunar_steel',
  },
  {
    // Continuous Atlas→Mars dolly — warp is stellar, not lens zoom
    id: 'transit',
    label: 'JOURNEY',
    range: [0.28, 0.52],
    ease: easeCinematic,
    cam: { from: [0, 0.02, 5.35], to: [0.55, 0.1, 4.7], look: [1.28, 0.06, -0.4], fov: [33, 33] },
    grade: { lift: [0.02, 0.02, 0.05], gain: [1.0, 1.0, 1.08], exposure: 0.9, grain: 0.05 },
    event: { dive: 0.05, storm: 0, carrier: 0, warp: 0.72 },
    dark: 0.18,
    fog: [18, 110],
    focus: 'transit',
    cue: 'journey',
    lookId: 'lunar_steel',
  },
  {
    id: 'mars',
    label: 'MERIDIANI',
    range: [0.52, 0.64],
    ease: easeInOutCubic,
    cam: { from: [0.55, 0.1, 4.7], to: [0.55, 0.1, 4.7], look: [1.28, 0.06, -0.4], fov: [33, 33] },
    grade: { lift: [0.09, 0.03, 0.01], gain: [1.22, 0.92, 0.72], exposure: 1.1, grain: 0.06 },
    event: { dive: 0, storm: 0.04, carrier: 0, warp: 0.12 },
    dark: 0.08,
    fog: [10, 48],
    focus: 'mars',
    cue: 'mars',
    hotspot: 'opportunity',
    lookId: 'meridiani_iron',
  },
  {
    // Illegal moment — Opportunity's last light (signature beat)
    id: 'dust_storm',
    label: 'LAST LIGHT',
    range: [0.64, 0.76],
    ease: easeInOutQuint,
    // Locked right-limb — grade/storm carry drama, not camera punch
    cam: { from: [0.55, 0.1, 4.7], to: [0.50, 0.11, 4.45], look: [1.20, 0.06, -0.32], fov: [33, 30.5] },
    grade: { lift: [0.16, 0.04, 0.005], gain: [1.55, 0.42, 0.18], exposure: 0.14, grain: 0.42 },
    event: { dive: 0, storm: 1, carrier: 0, warp: 0.35 },
    dark: 0.96,
    fog: [1.1, 5.2],
    focus: 'storm',
    cue: 'opportunity_death',
    hotspot: 'opportunity',
    smash: 0.70,
    uiMode: 'death',
    lookId: 'last_light',
  },
  {
    id: 'carrier',
    label: 'CARRIER',
    range: [0.76, 0.88],
    ease: easeInOutCubic,
    cam: { from: [0.55, 0.55, 7.2], to: [0.12, 0.22, 4.6], look: [0, 0.08, -9.2], fov: [42, 32] },
    grade: { lift: [0.01, 0.02, 0.055], gain: [0.88, 0.94, 1.18], exposure: 0.88, grain: 0.07 },
    event: { dive: 0, storm: 0, carrier: 0.55, warp: 0.15 },
    dark: 0.35,
    fog: [16, 80],
    focus: 'pioneer',
    cue: 'carrier',
    hotspot: 'voyager1',
    lookId: 'void',
  },
  {
    id: 'silence',
    label: 'SILENCE',
    range: [0.88, 1.0],
    ease: easeHold,
    cam: { from: [0.12, 0.22, 4.6], to: [0.28, 0.18, 3.7], look: [0.04, 0.1, -9.5], fov: [32, 28] },
    grade: { lift: [0.01, 0.015, 0.035], gain: [0.9, 0.94, 1.05], exposure: 0.72, grain: 0.04 },
    event: { dive: 0, storm: 0, carrier: 1, warp: 0.05 },
    dark: 0.78,
    fog: [22, 95],
    focus: 'pioneer',
    cue: 'carrier_lost',
    hotspot: 'voyager1',
    lookId: 'void',
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

  let cam = [
    lerp(act.cam.from[0], act.cam.to[0], e),
    lerp(act.cam.from[1], act.cam.to[1], e),
    lerp(act.cam.from[2], act.cam.to[2], e),
  ]
  let fov = lerp(act.cam.fov[0], act.cam.fov[1], e)
  let look = act.cam.look.slice ? act.cam.look.slice() : [...act.cam.look]
  let transitPhase = 0

  // Authored multi-beat journey — overrides linear from→to
  if (act.id === 'transit') {
    const path = samplePath(TRANSIT_KEYS, local, easeCinematic)
    cam = path.cam
    look = path.look
    fov = path.fov
    transitPhase = path.phase
  }

  let grade = { ...act.grade }
  let event = { ...act.event }
  let dark = act.dark
  let fogNear = act.fog[0]
  let fogFar = act.fog[1]

  if (i < ACTS.length - 1) {
    const next = ACTS[i + 1]
    // Longer blend into / out of Journey so acts don't smash
    const edgeStart = act.id === 'crater_dive' || act.id === 'transit' || next.id === 'transit' || next.id === 'mars'
      ? 0.52
      : 0.78
    const edge = smoothstep(edgeStart, 1, local)
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

  // Near pass: soft presence only — no smash bowl
  if (act.id === 'crater_dive') {
    const bowl = Math.sin(local * Math.PI)
    event.dive = Math.max(event.dive, bowl * 0.22)
    event.warp = Math.max(event.warp, bowl * 0.1)
    dark = Math.max(dark, bowl * 0.08)
  }

  // Journey: warp envelope is a single smooth arch — grade shifts, lens stays calm
  if (act.id === 'transit') {
    const leave = smoothstep(0.08, 0.42, local)
    const warpPeak = Math.sin(smoothstep(0.2, 0.82, local) * Math.PI)
    const approach = smoothstep(0.62, 1, local)
    event.dive = lerp(0.12, 0.02, leave)
    event.warp = leave * 0.2 + warpPeak * 0.78
    event.storm = approach * 0.025
    dark = 0.1 + leave * 0.12 + warpPeak * 0.1 - approach * 0.08
    grade.exposure = lerp(0.92, 1.06, approach) * (1 - warpPeak * 0.08)
    grade.lift = [
      lerp(0.02, 0.07, approach),
      lerp(0.02, 0.028, approach),
      lerp(0.05, 0.02, approach),
    ]
    grade.gain = [
      lerp(0.98, 1.16, approach),
      lerp(1.0, 0.94, approach),
      lerp(1.08, 0.8, approach),
    ]
    fogNear = lerp(16, 20, warpPeak)
    fogFar = lerp(85, 130, warpPeak)
  }

  // Illegal moment: storm eats exposure — then scored silence hole
  if (act.id === 'dust_storm') {
    const smother = easeInOutQuint(local)
    const crush = easeInQuart(smoothstep(0.15, 0.85, local))
    event.storm = Math.max(event.storm, smother)
    dark = Math.max(dark, 0.62 + smother * 0.36)
    grade.exposure = Math.min(grade.exposure, lerp(0.48, 0.045, crush))
    grade.grain = Math.max(grade.grain, lerp(0.12, 0.55, crush))
    // Mid-act black breath — the “last light” hole a stranger remembers
    if (local > 0.42 && local < 0.72) {
      const hole = Math.sin(((local - 0.42) / 0.3) * Math.PI)
      grade.exposure *= 1 - hole * 0.72
      dark = Math.max(dark, 0.88 + hole * 0.1)
    }
  }
  // Carrier: signal collapses into scored silence
  if (act.id === 'silence') {
    event.carrier = Math.max(event.carrier, easeHold(local, 0.25))
    dark = Math.max(dark, 0.55 + local * 0.35)
  }

  const smash = act.smash != null && Math.abs(p - act.smash) < 0.014

  // Body choreography hints for FilmDirector (0..1 weights)
  let journey = {
    moonPresence: act.focus === 'moon' || act.focus === 'dive' ? 1 : 0,
    marsPresence: act.focus === 'mars' || act.focus === 'storm' ? 1 : 0,
    moonExit: 0,
    marsApproach: 0,
    warp: event.warp,
  }
  if (act.id === 'transit') {
    // Overlap Moon exit with Mars approach — cinematic crossfade, not a hard cut
    journey = {
      moonPresence: 1 - smoothstep(0.12, 0.68, local),
      marsPresence: smoothstep(0.32, 0.82, local),
      moonExit: smoothstep(0.08, 0.62, local),
      marsApproach: smoothstep(0.38, 1, local),
      warp: event.warp,
    }
  }

  const shot = shotForProgress(p)
  // Shot look wins over act look — bible presets own the image identity
  const lookId = shot.lookId || act.lookId || 'lunar_steel'
  const bible = LOOKS[lookId]
  if (bible) {
    const pull = act.id === 'dust_storm' ? 0.92 : (act.id === 'transit' ? 0.45 : 0.72)
    grade = {
      lift: grade.lift.map((v, k) => lerp(v, bible.lift[k], pull)),
      gain: grade.gain.map((v, k) => lerp(v, bible.gain[k], pull)),
      exposure: lerp(grade.exposure, bible.exposure, pull),
      grain: lerp(grade.grain, bible.grain, pull),
    }
  }

  // Chrome kill 0→1 during last light — HUD must die with the image
  let chromeKill = 0
  if (act.id === 'dust_storm') {
    chromeKill = easeInOutQuint(smoothstep(0.08, 0.55, local))
  } else if (act.id === 'carrier' || act.id === 'silence') {
    chromeKill = act.id === 'silence' ? 0.35 : 0.15
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
    fx: event, // alias for audio / legacy
    event,
    dark,
    fog: [fogNear, fogFar],
    focus: act.focus,
    label: act.label,
    cue: act.cue,
    hotspot: act.hotspot || null,
    smash,
    transitPhase,
    journey,
    shot,
    shotId: shot.id,
    intent: shot.intent,
    damp: shot.damp ?? 0.06,
    fovDamp: shot.fovDamp ?? 0.07,
    uiMode: act.uiMode || (chromeKill > 0.55 ? 'death' : 'live'),
    lookId,
    chromeKill,
  }
}

/**
 * Sole motion stack (Awwwards + GSAP performance/plugins skills):
 * GSAP + ScrollTrigger + Lenis. Never Locomotive / ScrollSmoother together.
 * Prefer transform/opacity, one RAF clock, debounced refresh, reduced-motion bypass.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

// Mobile URL-bar resize spam — ignore chrome-bar-only resizes
ScrollTrigger.config({ ignoreMobileResize: true })

let lenis = null
let rafId = 0
let tickerBound = false
let refreshTimer = 0
let resizeObs = null
let filmRailTrigger = null
let filmScrollTween = null

/**
 * Single owner of continuum time (0→1).
 * ScrollTrigger on `#continuum-rail` is the only writer in production.
 * Dev scrubber may write directly for rehearsal.
 */
export const filmProgressRef = { current: 0 }

/** Labeled scrub positions — nav / Journey land here (not a second film driver). */
export const FILM_MARKERS = {
  hero: 0.04,
  atlas: 0.155,
  dive: 0.22,
  transit: 0.30,
  meridiani: 0.56,
  storm: 0.68,
  lastLight: 0.70,
  carrier: 0.80,
  silence: 0.92,
  coda: 1,
}

/**
 * Authored rail weights — intimacy + last light hold more scroll meters.
 * Each segment: film tip endpoint + relative weight along the continuum rail.
 * Linear ScrollTrigger progress maps through these into film tip space.
 */
export const RAIL_SEGMENTS = [
  { tip: 0.09, weight: 1.0 },   // arrival
  { tip: 0.18, weight: 1.55 },  // intimacy — linger on surveyed sites
  { tip: 0.28, weight: 1.05 },  // near pass
  { tip: 0.52, weight: 0.95 },  // journey corridor
  { tip: 0.64, weight: 1.25 },  // meridiani settle
  { tip: 0.76, weight: 1.7 },   // last light — illegal hold
  { tip: 0.88, weight: 0.9 },   // carrier
  { tip: 1.0, weight: 0.85 },   // silence / coda
]

function railSegmentMeta() {
  let total = 0
  const segs = RAIL_SEGMENTS.map((s) => {
    total += s.weight
    return { ...s, cum: total }
  })
  return { segs, total }
}

/** Linear rail progress (0→1 from ScrollTrigger) → weighted film tip. */
export function mapRailProgress(linear) {
  const t = Math.max(0, Math.min(1, Number(linear) || 0))
  const { segs, total } = railSegmentMeta()
  const target = t * total
  let prevTip = 0
  let prevCum = 0
  for (const s of segs) {
    if (target <= s.cum) {
      const local = s.weight <= 0 ? 1 : (target - prevCum) / s.weight
      return prevTip + (s.tip - prevTip) * Math.max(0, Math.min(1, local))
    }
    prevTip = s.tip
    prevCum = s.cum
  }
  return 1
}

/** Film tip → linear rail progress (inverse of mapRailProgress) for scrollTo. */
export function unmapRailProgress(filmTip) {
  const tip = Math.max(0, Math.min(1, Number(filmTip) || 0))
  const { segs, total } = railSegmentMeta()
  let prevTip = 0
  let prevCum = 0
  for (const s of segs) {
    if (tip <= s.tip + 1e-9) {
      const span = s.tip - prevTip
      const local = span <= 1e-9 ? 1 : (tip - prevTip) / span
      return (prevCum + s.weight * Math.max(0, Math.min(1, local))) / total
    }
    prevTip = s.tip
    prevCum = s.cum
  }
  return 1
}

export function getFilmProgress() {
  return filmProgressRef.current
}

export function setFilmProgress(p) {
  filmProgressRef.current = Math.max(0, Math.min(1, Number(p) || 0))
}

/** MotionValue-shaped reader for FilmDirector / Nav — no React scroll spring. */
export const filmProgressMv = {
  get: () => filmProgressRef.current,
  getVelocity: () => 0,
  on: () => () => {},
  onChange: () => () => {},
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Debounced layout refresh — only when content/fonts actually change size */
export function scheduleScrollRefresh(delay = 120) {
  if (typeof window === 'undefined') return
  window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    ScrollTrigger.refresh()
  }, delay)
}

export function createScrollEngine({ onScroll } = {}) {
  destroyScrollEngine()
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('lenis', 'lenis-smooth')
    return { lenis: null, refresh: () => ScrollTrigger.refresh() }
  }

  // Softer lerp for one continuous Objective→Fleet plate (graphic-architect pacing)
  lenis = new Lenis({
    lerp: 0.072,
    smoothWheel: true,
    wheelMultiplier: 0.88,
    touchMultiplier: 1.12,
    syncTouch: false,
    syncTouchLerp: 0.07,
    autoResize: true,
  })

  lenis.on('scroll', (e) => {
    ScrollTrigger.update()
    onScroll?.(e)
  })

  const tick = (time) => {
    lenis?.raf(time * 1000)
  }
  if (!tickerBound) {
    gsap.ticker.add(tick)
    // Shared RAF with Lenis — lagSmoothing must stay 0 or scroll feels sticky
    gsap.ticker.lagSmoothing(0)
    tickerBound = true
    createScrollEngine._tick = tick
  }

  document.documentElement.classList.add('lenis', 'lenis-smooth')

  // Fonts / late images shift layout — one debounced refresh, not per-frame
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => scheduleScrollRefresh(80)).catch(() => {})
  }
  if (typeof ResizeObserver !== 'undefined' && !resizeObs) {
    resizeObs = new ResizeObserver(() => scheduleScrollRefresh(160))
    resizeObs.observe(document.documentElement)
  }

  requestAnimationFrame(() => ScrollTrigger.refresh())

  return {
    lenis,
    refresh: () => scheduleScrollRefresh(0),
  }
}

/** Smooth-scroll to a hash target (nav links) via Lenis, ScrollToPlugin fallback */
export function scrollToHash(hash, { offset = -72, duration } = {}) {
  const id = String(hash || '').replace(/^#/, '')
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) {
    const opts = { offset, immediate: false }
    if (Number.isFinite(duration)) {
      opts.duration = duration
      opts.easing = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))
    }
    lenis.scrollTo(el, opts)
  } else if (!prefersReducedMotion()) {
    gsap.to(window, {
      duration: Number.isFinite(duration) ? duration : 0.95,
      ease: 'power3.out',
      scrollTo: { y: el, offsetY: Math.abs(offset) },
      overwrite: true,
    })
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top: y, behavior: 'auto' })
  }
}

/**
 * Owned film rail — `#continuum-rail` scroll progress IS filmProgress (0→1).
 * Before the rail → 0 (hero). After the rail (Recover+) → 1 (silence/coda).
 */
export function createFilmRail() {
  destroyFilmRail()
  const rail = typeof document !== 'undefined'
    ? document.getElementById('continuum-rail')
    : null
  if (!rail) return null

  filmRailTrigger = ScrollTrigger.create({
    id: 'continuum-film-rail',
    trigger: rail,
    start: 'top top',
    end: 'bottom bottom',
    scrub: prefersReducedMotion() ? false : 0.35,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      filmProgressRef.current = mapRailProgress(self.progress)
    },
    onLeaveBack: () => {
      filmProgressRef.current = 0
    },
    onLeave: () => {
      filmProgressRef.current = 1
    },
  })

  // Sync once after layout — map through authored weights
  requestAnimationFrame(() => {
    if (filmRailTrigger) {
      filmProgressRef.current = mapRailProgress(filmRailTrigger.progress)
    }
  })

  return filmRailTrigger
}

export function destroyFilmRail() {
  if (filmScrollTween) {
    filmScrollTween.kill()
    filmScrollTween = null
  }
  if (filmRailTrigger) {
    filmRailTrigger.kill()
    filmRailTrigger = null
  }
}

/** Pixel scroll Y for a film tip — inverts authored rail weights. */
export function filmProgressToScrollY(p) {
  const linear = unmapRailProgress(p)
  if (!filmRailTrigger) {
    const rail = document.getElementById('continuum-rail')
    if (!rail) return window.scrollY
    const top = rail.getBoundingClientRect().top + window.scrollY
    const travel = Math.max(1, rail.offsetHeight - window.innerHeight)
    return top + travel * linear
  }
  return filmRailTrigger.start + (filmRailTrigger.end - filmRailTrigger.start) * linear
}

/** Scroll the owned rail to a film tip — the ONLY way nav moves the film. */
export function scrollToFilmProgress(p, { duration, immediate = false } = {}) {
  // Ensure rail exists before measuring (nav can fire before boot effect settles)
  if (!filmRailTrigger) createFilmRail()
  const tip = Math.max(0, Math.min(1, Number(p) || 0))
  const y = filmProgressToScrollY(tip)
  if (immediate || prefersReducedMotion()) {
    if (lenis) lenis.scrollTo(y, { immediate: true })
    else window.scrollTo(0, y)
    setFilmProgress(tip)
    return
  }
  const dur = Number.isFinite(duration) ? duration : 1.35
  if (lenis) {
    lenis.scrollTo(y, {
      duration: dur,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    })
  } else {
    gsap.to(window, {
      duration: dur,
      ease: 'power3.out',
      scrollTo: y,
      overwrite: true,
    })
  }
}

export function scrollToFilmMarker(name, opts = {}) {
  const p = FILM_MARKERS[name]
  if (!Number.isFinite(p)) return
  scrollToFilmProgress(p, opts)
}

/**
 * JOURNEY nav — cinematic scrub of the *owned* rail (Atlas → Meridiani).
 * No filmDriveRef dual driver: Lenis/scroll position writes filmProgress via ScrollTrigger.
 */
export function playMoonToMarsJourney({
  reduced = false,
  onStart,
  onComplete,
} = {}) {
  if (filmScrollTween) {
    filmScrollTween.kill()
    filmScrollTween = null
  }
  if (playMoonToMarsJourney._tl) {
    playMoonToMarsJourney._tl.kill()
    playMoonToMarsJourney._tl = null
  }

  // Ensure the owned rail exists + layout is measured before scrubbing
  if (!filmRailTrigger) createFilmRail()
  ScrollTrigger.refresh()

  const fromP = gsap.utils.clamp(
    FILM_MARKERS.atlas,
    FILM_MARKERS.transit,
    Math.max(filmProgressRef.current, FILM_MARKERS.atlas),
  )
  const toP = FILM_MARKERS.meridiani
  onStart?.()

  if (reduced || prefersReducedMotion()) {
    scrollToFilmProgress(toP, { duration: 0.55 })
    const done = window.setTimeout(() => onComplete?.(), 650)
    return () => window.clearTimeout(done)
  }

  // Sit on atlas tip before the long scrub (weights inverted for scroll Y)
  scrollToFilmProgress(fromP, { immediate: true })

  const state = { p: fromP }
  const tl = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete: () => {
      playMoonToMarsJourney._tl = null
      filmScrollTween = null
      scrollToFilmProgress(toP, { duration: 0.9 })
      gsap.delayedCall(0.35, () => onComplete?.())
    },
  })

  tl.to(state, {
    p: toP,
    duration: 12.5,
    ease: 'power1.inOut',
    onUpdate: () => {
      const y = filmProgressToScrollY(state.p)
      if (lenis) lenis.scrollTo(y, { immediate: true })
      else window.scrollTo(0, y)
      // Stamp film tip explicitly — ST lag must not fight Journey
      filmProgressRef.current = state.p
    },
  }, 0)

  playMoonToMarsJourney._tl = tl
  filmScrollTween = tl
  return () => {
    tl.kill()
    if (playMoonToMarsJourney._tl === tl) playMoonToMarsJourney._tl = null
    filmScrollTween = null
  }
}

export function destroyScrollEngine() {
  window.clearTimeout(refreshTimer)
  refreshTimer = 0
  destroyFilmRail()
  if (resizeObs) {
    resizeObs.disconnect()
    resizeObs = null
  }
  if (createScrollEngine._tick && tickerBound) {
    gsap.ticker.remove(createScrollEngine._tick)
    tickerBound = false
  }
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  if (lenis) {
    lenis.destroy()
    lenis = null
  }
  document.documentElement.classList.remove('lenis', 'lenis-smooth')
  ScrollTrigger.getAll().forEach((t) => t.kill())
}

/** Hero intro — transform + autoAlpha only (compositor-friendly) */
export function playHeroIntro(root, { reduced, seedDelay = 0 } = {}) {
  if (!root) return () => {}
  const kicker = root.querySelector('[data-hero-kicker]')
  const lines = root.querySelectorAll('[data-hero-line]')
  const body = root.querySelector('[data-hero-body]')
  const cta = root.querySelector('[data-hero-cta]')
  const cue = root.querySelector('[data-hero-cue]')
  const animating = [kicker, ...lines, body, cta, cue].filter(Boolean)

  if (reduced) {
    gsap.set(animating, { autoAlpha: 1, y: 0, clearProps: 'filter,willChange' })
    return () => {}
  }

  animating.forEach((node) => { node.style.willChange = 'transform, opacity' })

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out', force3D: true },
    delay: seedDelay,
    onComplete: () => {
      animating.forEach((node) => { node.style.willChange = 'auto' })
      gsap.set(animating, { clearProps: 'willChange' })
    },
  })
  gsap.set([kicker, body, cta, cue].filter(Boolean), { autoAlpha: 0, y: 28 })
  // Soft blur only on display lines — cleared after tween to drop paint cost
  gsap.set(lines, { autoAlpha: 0, y: 56, filter: 'blur(8px)' })

  if (kicker) tl.to(kicker, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.05)
  if (lines.length) {
    tl.to(lines, {
      autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.05, stagger: 0.12,
    }, 0.18)
  }
  if (body) tl.to(body, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.55)
  if (cta) tl.to(cta, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.72)
  if (cue) tl.to(cue, { autoAlpha: 0.7, y: 0, duration: 0.6 }, 0.95)
  tl.add(() => {
    gsap.set(lines, { clearProps: 'filter' })
  })

  return () => {
    tl.kill()
    animating.forEach((node) => { node.style.willChange = 'auto' })
  }
}

/** Preloader choreography → callback */
export function playBootSequence(root, { onDone, reduced, duration = 2.1 } = {}) {
  if (!root) { onDone?.(); return () => {} }
  if (reduced) {
    onDone?.()
    return () => {}
  }
  const brand = root.querySelector('[data-boot-brand]')
  const meta = root.querySelector('[data-boot-meta]')
  const panels = root.querySelectorAll('[data-boot-panel]')
  const bar = root.querySelector('[data-boot-bar]')

  const tl = gsap.timeline({
    defaults: { force3D: true },
    onComplete: () => onDone?.(),
  })
  gsap.set([brand, meta].filter(Boolean), { autoAlpha: 0, y: 20 })
  if (bar) gsap.set(bar, { scaleX: 0, transformOrigin: 'left' })

  if (brand) tl.to(brand, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.1)
  if (meta) tl.to(meta, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.35)
  if (bar) tl.to(bar, { scaleX: 1, duration: duration * 0.55, ease: 'power2.inOut' }, 0.2)
  if (panels.length) {
    tl.to(panels, {
      scaleY: 0,
      duration: 0.85,
      stagger: 0.07,
      ease: 'power4.inOut',
    }, duration * 0.55)
  }
  tl.to(root, { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' }, '-=0.15')

  return () => { tl.kill() }
}

/** Section reveal — transform + autoAlpha stagger; once + kill when done */
export function revealOnScroll(el, { reduced } = {}) {
  if (!el) return () => {}
  if (reduced) {
    gsap.set(el, { autoAlpha: 1, y: 0 })
    return () => {}
  }
  const parts = el.querySelectorAll('[data-reveal]')
  const targets = parts.length ? parts : el
  gsap.set(targets, { autoAlpha: 0, y: 36 })
  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      gsap.to(targets, {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        force3D: true,
        onComplete: () => {
          gsap.set(targets, { clearProps: 'willChange' })
        },
      })
    },
  })
  return () => st.kill()
}

export { gsap, ScrollTrigger, ScrollToPlugin }

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
 * JOURNEY nav — GSAP-driven Moon zoom → warp corridor → Mars arrive.
 * Drives Continuum film progress via filmDriveRef while Lenis scrolls the page.
 * Uses gsap.utils.clamp / mapRange / interpolate for the cinematic beats.
 */
export function playMoonToMarsJourney({
  filmDriveRef,
  getProgress,
  reduced = false,
  onStart,
  onComplete,
} = {}) {
  if (playMoonToMarsJourney._tl) {
    playMoonToMarsJourney._tl.kill()
    playMoonToMarsJourney._tl = null
  }

  const raw = typeof getProgress === 'function' ? getProgress() : 0
  // Atlas→Journey: start from intimacy hold so the handoff is continuous
  const atlasStart = gsap.utils.clamp(0.14, 0.22, Number.isFinite(raw) ? Math.max(raw, 0.155) : 0.155)
  const state = { p: atlasStart }
  if (filmDriveRef) filmDriveRef.current = atlasStart
  onStart?.()

  const write = () => {
    if (filmDriveRef) filmDriveRef.current = state.p
  }

  if (reduced || prefersReducedMotion()) {
    state.p = 0.56
    write()
    scrollToHash('#journey-mars', { offset: -80, duration: 0.6 })
    const done = window.setTimeout(() => {
      if (filmDriveRef) filmDriveRef.current = null
      onComplete?.()
    }, 700)
    return () => window.clearTimeout(done)
  }

  // One continuous film drive — Atlas hold → Meridiani (no beat-to-beat zoom hits)
  const marsHold = 0.56
  write()

  const tl = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete: () => {
      scrollToHash('#journey-mars', { offset: -90, duration: 1.4 })
      gsap.delayedCall(0.7, () => {
        if (filmDriveRef) filmDriveRef.current = null
        playMoonToMarsJourney._tl = null
        onComplete?.()
      })
    },
  })

  tl.to(state, {
    p: marsHold,
    duration: 12.5,
    ease: 'power1.inOut',
    onUpdate: write,
  }, 0)

  // Page scroll rides alongside — long Lenis glide, no snap
  scrollToHash('#journey', { offset: -72, duration: 2.8 })
  gsap.delayedCall(2.6, () => {
    scrollToHash('#journey-mars', { offset: -90, duration: 9.2 })
  })

  playMoonToMarsJourney._tl = tl
  return () => {
    tl.kill()
    if (playMoonToMarsJourney._tl === tl) playMoonToMarsJourney._tl = null
  }
}

export function destroyScrollEngine() {
  window.clearTimeout(refreshTimer)
  refreshTimer = 0
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

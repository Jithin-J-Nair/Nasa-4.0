/**
 * Sole motion stack (Awwwards skill): GSAP + ScrollTrigger + Lenis.
 * One smooth-scroll engine. Never Locomotive. Reduced-motion bypass.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

let lenis = null
let rafId = 0
let tickerBound = false

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createScrollEngine({ onScroll } = {}) {
  destroyScrollEngine()
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('lenis', 'lenis-smooth')
    return { lenis: null, refresh: () => ScrollTrigger.refresh() }
  }

  lenis = new Lenis({
    duration: 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.25,
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
    gsap.ticker.lagSmoothing(0)
    tickerBound = true
    createScrollEngine._tick = tick
  }

  document.documentElement.classList.add('lenis', 'lenis-smooth')

  requestAnimationFrame(() => ScrollTrigger.refresh())

  return {
    lenis,
    refresh: () => ScrollTrigger.refresh(),
  }
}

export function destroyScrollEngine() {
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

/** Hero intro — readable before complete */
export function playHeroIntro(root, { reduced, seedDelay = 0 } = {}) {
  if (!root) return () => {}
  const kicker = root.querySelector('[data-hero-kicker]')
  const lines = root.querySelectorAll('[data-hero-line]')
  const body = root.querySelector('[data-hero-body]')
  const cta = root.querySelector('[data-hero-cta]')
  const cue = root.querySelector('[data-hero-cue]')

  if (reduced) {
    gsap.set([kicker, lines, body, cta, cue].filter(Boolean), { opacity: 1, y: 0, filter: 'none' })
    return () => {}
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: seedDelay })
  gsap.set([kicker, body, cta, cue].filter(Boolean), { opacity: 0, y: 28 })
  gsap.set(lines, { opacity: 0, y: 64, rotateX: 18, transformOrigin: '50% 100%' })

  if (kicker) tl.to(kicker, { opacity: 1, y: 0, duration: 0.7 }, 0.05)
  if (lines.length) {
    tl.to(lines, {
      opacity: 1, y: 0, rotateX: 0, duration: 1.05, stagger: 0.12,
    }, 0.18)
  }
  if (body) tl.to(body, { opacity: 1, y: 0, duration: 0.8 }, 0.55)
  if (cta) tl.to(cta, { opacity: 1, y: 0, duration: 0.7 }, 0.72)
  if (cue) tl.to(cue, { opacity: 0.7, y: 0, duration: 0.6 }, 0.95)

  return () => { tl.kill() }
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
    onComplete: () => onDone?.(),
  })
  gsap.set([brand, meta].filter(Boolean), { opacity: 0, y: 20 })
  if (bar) gsap.set(bar, { scaleX: 0, transformOrigin: 'left' })

  if (brand) tl.to(brand, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.1)
  if (meta) tl.to(meta, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.35)
  if (bar) tl.to(bar, { scaleX: 1, duration: duration * 0.55, ease: 'power2.inOut' }, 0.2)
  if (panels.length) {
    tl.to(panels, {
      scaleY: 0,
      duration: 0.85,
      stagger: 0.07,
      ease: 'power4.inOut',
    }, duration * 0.55)
  }
  tl.to(root, { opacity: 0, duration: 0.45, ease: 'power2.inOut' }, '-=0.15')

  return () => { tl.kill() }
}

/** Section reveal — word/line stagger with accessible unsplit twin */
export function revealOnScroll(el, { reduced } = {}) {
  if (!el) return () => {}
  if (reduced) {
    gsap.set(el, { opacity: 1, y: 0 })
    return () => {}
  }
  const parts = el.querySelectorAll('[data-reveal]')
  gsap.set(parts.length ? parts : el, { opacity: 0, y: 36 })
  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top 82%',
    once: true,
    onEnter: () => {
      gsap.to(parts.length ? parts : el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
      })
    },
  })
  return () => st.kill()
}

export { gsap, ScrollTrigger }

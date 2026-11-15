/* eslint-disable react-hooks/exhaustive-deps */
/**
 * SILENT FLEET — Abandoned but not Forgotten
 * NASA Space Apps Challenge 2026
 * One continuum world. Diegetic story. Recovered hardware.
 * Sources: NASA Catalogue of Manmade Material on the Moon, NSSDCA, LROC, ALSJ, HiRISE, PDS
 * AI-assisted code generation disclosed per Space Apps guidelines.
 */
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, createContext, useContext, Component, lazy } from 'react'
import { createPortal } from 'react-dom'
import {
  motion, AnimatePresence, useSpring, useMotionValue,
  useInView,
} from 'framer-motion'
import { createSoundscape } from './audio/Soundscape'
import { ARTIFACTS, NASA_RESOURCES } from './data/artifacts'
import { VOYAGER_LIGHT_DAY, lightDayRemaining, pad2 } from './data/voyagerLightDay'
import {
  preloadContinuumModule, preloadCriticalMoon, preloadPlanetTextures, preloadMarsAndVoyager,
} from './world/preloadTextures'
import { GLOBAL_CSS } from './styles/global.css.js'
import { FLEET_SHELF_CSS } from './styles/fleet-shelf.css.js'
import {
  createScrollEngine, destroyScrollEngine, scrollToHash, playHeroIntro, playBootSequence,
  revealOnScroll, scheduleScrollRefresh, playMoonToMarsJourney,
  createFilmRail, filmProgressRef, FILM_MARKERS, scrollToFilmMarker,
  pauseScrollEngine, resumeScrollEngine,
} from './motion/engine'
import { ranged, getSessionSeed } from './motion/seed'
import {
  Magnet, ClickSpark, FadeContent, TrueFocus, GlareHover,
  GradientText, BlurText, OptionWheel, SplitText, Noise, ShinyText, DecryptedText,
  DecayCard,
} from './bits'
const FleetShelf = lazy(() => import('./fleet/FleetShelf'))
import './bits/GradientText/GradientText.css'
import './bits/SplitText/SplitText.css'
import './bits/OptionWheel/OptionWheel.css'
import './bits/TrueFocus/TrueFocus.css'
import './bits/Noise/Noise.css'
import './bits/ShinyText/ShinyText.css'
import './bits/GlareHover/GlareHover.css'
import './bits/DecayCard/DecayCard.css'

const ContinuumCanvas = lazy(() => import('./world/ContinuumCanvas'))

import '@fontsource/syne/700.css'
import '@fontsource/syne/800.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/unbounded/600.css'
import '@fontsource/unbounded/700.css'

const EASE = [0.22, 1, 0.36, 1]
const SPRING = { stiffness: 140, damping: 26, mass: 0.9 }
/** Hero challenge plate — NASA leftover hardware (Eagle LM) · Tranquility Base */
const HERO_LEFTOVER = ARTIFACTS.find((a) => a.id === 'a11-lm')
const MARS_HOTSPOT_SITES = ARTIFACTS.filter((a) => a.body === 'mars' && Number.isFinite(a.lat) && Number.isFinite(a.lon))
const MARS_HOTSPOT_LABELS = MARS_HOTSPOT_SITES.map((a) => a.name)
const MOON_HOTSPOT_SITES = ARTIFACTS.filter((a) => a.body === 'moon' && Number.isFinite(a.lat) && Number.isFinite(a.lon))
const MOON_HOTSPOT_LABELS = MOON_HOTSPOT_SITES.map((a) => a.name)
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789░▒▓█/<>=+#*'

function LineReveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = usePrefersReduced()
  return (
    <span ref={ref} className={`line-mask ${className}`}>
      <motion.span
        initial={reduced ? false : { y: '110%' }}
        animate={inView || reduced ? { y: 0 } : { y: '110%' }}
        transition={{ duration: 0.9, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function useMediaQuery(query) {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

function useIsCoarse() {
  return useMediaQuery('(pointer: coarse)')
}


function FilmGrain({ reduced }) {
  const coarse = useIsCoarse()
  if (reduced) return null
  return (
    <Noise
      fixed
      opacity={coarse ? 0.028 : 0.045}
      size={coarse ? 1.35 : 1.15}
      fps={coarse ? 6 : 12}
      blendMode="soft-light"
      contrast={0.55}
      dust={0}
      scratches={0}
      scanlines={0}
      flicker={coarse ? 0 : 0.08}
      zIndex={48}
      className="sf-film-grain"
    />
  )
}

function usePrefersReduced() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

function useMouse() {
  const mouse = useRef({ x: 0, y: 0, nx: 0, ny: 0 })
  useEffect(() => {
    const move = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      mouse.current.nx = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.ny = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return mouse
}

function useUTCClock() {
  const [utc, setUtc] = useState('--:--:-- UTC')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setUtc(`${d.toISOString().slice(11, 19)} UTC`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return utc
}

/** Live countdown to Voyager 1 · 1 light-day (18 Nov 2026, 10:16:07 UTC). */
function useLightDayCountdown() {
  const [rem, setRem] = useState(() => lightDayRemaining())
  useEffect(() => {
    const id = setInterval(() => setRem(lightDayRemaining()), 1000)
    return () => clearInterval(id)
  }, [])
  return rem
}

function LightDayCountdown({ compact = false, className = '' }) {
  const rem = useLightDayCountdown()
  const units = [
    { label: 'DAYS', value: rem.days },
    { label: 'HRS', value: rem.hours },
    { label: 'MIN', value: rem.minutes },
    { label: 'SEC', value: rem.seconds },
  ]
  return (
    <aside
      className={`light-day ${compact ? 'light-day--compact' : ''} ${className}`.trim()}
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="light-day__kicker mono">
        {rem.past ? 'VOYAGER 1 · MILESTONE REACHED' : 'VOYAGER 1 · APPROACHING 1 LIGHT-DAY'}
      </p>
      {!compact && (
        <p className="light-day__lede">
          {rem.past
            ? `The first human-made object is now ${VOYAGER_LIGHT_DAY.label} — ${VOYAGER_LIGHT_DAY.distanceMi}. A whisper takes a full day to arrive.`
            : `Soon the first human-made object will be ${VOYAGER_LIGHT_DAY.label} — ${VOYAGER_LIGHT_DAY.distanceMi}. When it crosses, light itself needs 24 hours to catch up.`}
        </p>
      )}
      <div className="light-day__grid" role="timer" aria-label={rem.past ? 'Time since Voyager 1 light-day' : 'Countdown to Voyager 1 light-day'}>
        {units.map((u) => (
          <div key={u.label} className="light-day__cell">
            <span className="light-day__num display">{u.label === 'DAYS' ? String(u.value) : pad2(u.value)}</span>
            <span className="light-day__unit mono">{u.label}</span>
          </div>
        ))}
      </div>
      <p className="light-day__meta mono">
        {rem.past ? 'ELAPSED SINCE' : 'COUNTDOWN TO'}{' '}
        18 NOV 2026 · 10:16:07 UTC · {VOYAGER_LIGHT_DAY.au}
        {' · '}
        <a href={VOYAGER_LIGHT_DAY.source} target="_blank" rel="noreferrer">NASA SOURCE ↗</a>
      </p>
    </aside>
  )
}

function scrambleText(target, progress) {
  const p = Math.max(0, Math.min(1, progress))
  return target.split('').map((ch, i) => {
    if (ch === ' ' || ch === '·' || ch === '.' || ch === ',') return ch
    if (i / target.length < p) return target[i]
    return SCRAMBLE_CHARS[(i * 17 + Math.floor(p * 40)) % SCRAMBLE_CHARS.length]
  }).join('')
}

function ScrambleLine({ text, active = true, className = '', as: Tag = 'span', delay = 0 }) {
  const [out, setOut] = useState(text)
  useEffect(() => {
    if (!active) { setOut(text); return undefined }
    let raf
    const t0 = performance.now() + delay * 1000
    const loop = (now) => {
      const p = Math.max(0, Math.min(1, (now - t0) / 900))
      setOut(scrambleText(text, p))
      if (p < 1) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [text, active, delay])
  return <Tag className={className}>{out}</Tag>
}

function MagneticButton({ children, onClick, href, className = '', ...rest }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const labelX = useSpring(x, { stiffness: 220, damping: 18 })
  const labelY = useSpring(y, { stiffness: 220, damping: 18 })
  const coarse = useIsCoarse()

  const onMove = (e) => {
    if (coarse || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28)
  }
  const onLeave = () => { x.set(0); y.set(0) }
  const Comp = href ? motion.a : motion.button

  // Hash links must go through Lenis — native jump + smooth scroll = earthquake
  const handleClick = (e) => {
    x.set(0)
    y.set(0)
    if (href && href.startsWith('#')) {
      e.preventDefault()
      const id = href.slice(1)
      if (id === 'top') {
        scrollToHash('#top', { duration: 0.95, offset: 0 })
        if (typeof history !== 'undefined') {
          history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } else {
        scrollToHash(href, { duration: 1.05 })
        if (typeof history !== 'undefined') history.replaceState(null, '', href)
      }
    }
    onClick?.(e)
  }

  return (
    <Comp
      ref={ref}
      href={href}
      onClick={handleClick}
      className={`mag-btn ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x: labelX, y: labelY }}
      {...rest}
    >
      <span className="fill" aria-hidden />
      <motion.span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
        {children}
        <span className="arrow" aria-hidden>↗</span>
      </motion.span>
    </Comp>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.warn('[SilentFleet]', err?.message || err) }
  render() {
    if (this.state.err) return this.props.fallback || null
    return this.props.children
  }
}

const CursorCtx = createContext({ setLabel: () => {}, setVisible: () => {} })
function useCursor() { return useContext(CursorCtx) }

function preloadImage(src) {
  if (!src || typeof Image === 'undefined') return Promise.resolve()

  return new Promise((resolve) => {
    const image = new Image()
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      image.onload = null
      image.onerror = null
      resolve()
    }
    const fail = (error) => {
      if (settled) return
      console.warn('[SilentFleet] startup image preload failed', src, error)
      finish()
    }
    const decode = () => {
      if (typeof image.decode === 'function') image.decode().then(finish, fail)
      else finish()
    }

    image.onload = decode
    image.onerror = fail
    image.src = src
    if (image.complete) {
      if (image.naturalWidth > 0) decode()
      else fail(new Error('Image completed without decoded pixels.'))
    }
  })
}

function Preloader({ onDone, reduced, moonReady }) {
  const rootRef = useRef(null)
  const [bootMsg, setBootMsg] = useState('LOADING LUNAR SURFACE')
  useEffect(() => {
    let cancelled = false
    let introDone = false
    let assetsDone = false
    let finished = false
    let degraded = false

    const finish = (force = false) => {
      if (cancelled || finished) return
      if (!force && (!animDone || !assetsDone)) return
      finished = true
      animDone = true
      assetsDone = true
      onDone?.({ degraded })
    }

    const assets = Promise.all([
      preloadContinuumModule(),
      // MoonReady may never fire on a bad WebGL remount — don't block boot forever
      Promise.race([
        moonReady,
        new Promise((resolve) => { window.setTimeout(resolve, reduced ? 1800 : 9000) }),
      ]),
    ]).then(() => {
      if (cancelled) return
      assetsDone = true
      setBootMsg('LUNAR SURFACE LOCKED')
      finish()
    }).catch(() => {
      if (cancelled) return
      degraded = true
      assetsDone = true
      setBootMsg('LUNAR MAPS DELAYED · ENTERING ANYWAY')
      finish()
    })
    preloadPlanetTextures(mobile)
    preloadMarsAndVoyager(mobile)

    const minTimer = minTimeDone ? 0 : window.setTimeout(() => {
      minTimeDone = true
      finish()
    }, 1200)

    const dur = ranged(0.95, 1.1, 3)
    sequence = playBootSequence(rootRef.current, {
      reduced,
      duration: dur,
      onReady: () => {
        introDone = true
        finish()
      },
      onDone,
    })
    finish()

    // Hard escape: assetsDone alone used to skip this path and strand the UI
    // when the boot timeline never completed after a remount/reload.
    const safety = window.setTimeout(() => {
      if (finished || cancelled) return
      degraded = true
      assetsDone = true
      animDone = true
      setBootMsg('SIGNAL TIMEOUT · ENTERING CONTINUUM')
      finish(true)
    }, reduced ? 2500 : 12000)

    return () => {
      cancelled = true
      window.clearTimeout(minTimer)
      window.clearTimeout(safety)
      sequence?.stop()
      void assets
    }
  }, [onDone, reduced, moonReady])
  return (
    <div className="preloader" ref={rootRef}>
      <div className="preloader-panels" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} data-boot-panel style={{ transformOrigin: i % 2 ? 'bottom' : 'top' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <p className="kicker" data-boot-meta style={{ marginBottom: '1rem', color: 'var(--ice)' }}>
          NASA SPACE APPS 2026 · CONTINUUM · SEED {String(getSessionSeed()).slice(-4)}
        </p>
        <div className="display" data-boot-brand style={{ fontSize: 'clamp(2.8rem, 9vw, 5.5rem)', letterSpacing: '-0.05em' }}>
          SILENT FLEET
        </div>
        <div className="boot-bar" aria-hidden><i data-boot-bar /></div>
        <p className="mono" data-boot-meta style={{ marginTop: '1.25rem', fontSize: '0.65rem', letterSpacing: '0.18em', color: 'var(--ink-mute)' }}>
          {bootMsg}
        </p>
      </div>
    </div>
  )
}

function Nav({ progress, onNavAtlas, onNavJourney, onNavCoda }) {
  const scaleX = useSpring(progress, { stiffness: 90, damping: 24 })
  const go = (fn) => (e) => {
    e.preventDefault()
    fn?.(e)
  }
  return (
    <nav className="nav" aria-label="Primary">
      <a
        href="#top"
        className="nav-brand"
        aria-label="Silent Fleet home"
        onClick={(e) => {
          e.preventDefault()
          scrollToHash('#top', { duration: 0.95, offset: 0 })
          if (typeof history !== 'undefined') {
            history.replaceState(null, '', window.location.pathname + window.location.search)
          }
        }}
      >
        SILENT FLEET
      </a>
      <div className="nav-links" role="list">
        <a href="#objective" role="listitem" onClick={go(() => scrollToHash('#objective', { duration: 1.05 }))}>
          OBJECTIVE
        </a>
        <a href="#atlas" role="listitem" onClick={go(onNavAtlas)}>ATLAS</a>
        <a href="#journey" role="listitem" onClick={go(onNavJourney)}>MARS</a>
        <a href="#fleet" role="listitem" onClick={go(onNavCoda)}>FLEET</a>
      </div>
      <motion.div className="nav-progress" style={{ scaleX, width: '100%' }} />
    </nav>
  )
}

function FilmJourney({ label = 'JOURNEY' }) {
  const rootRef = useRef(null)
  const meterFillRef = useRef(null)
  const [journeyLive, setJourneyLive] = useState(true)

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    // Hide as soon as Recover/Fleet enter — never leave a fixed ghost over later chapters
    const io = new IntersectionObserver(
      ([e]) => setJourneyLive(!!e?.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px -18% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Real film tip → meter (not a fake CSS loop)
  useEffect(() => {
    let id = 0
    const tick = () => {
      const fill = meterFillRef.current
      if (fill) {
        const p = Math.max(0, Math.min(1, filmProgressRef.current || 0))
        fill.style.transform = `scaleX(${p})`
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  const silenceAct = label === 'SILENCE' || label === 'CARRIER'
  const silence = silenceAct && journeyLive
  const phase =
    label === 'NEAR PASS' || label === 'NEAR SIDE' ? 'Lunar zoom'
      : label === 'JOURNEY' ? 'Moon → Mars corridor'
        : label === 'MERIDIANI' || label === 'LAST LIGHT' || label === 'DUST STORM' ? 'Mars · Meridiani'
          : silenceAct ? 'Voyager 1 · interstellar'
            : 'Continuum'
  return (
    <section
      ref={rootRef}
      id="journey"
      className={`journey-spacer${silence ? ' is-silence-live' : ''}`}
      aria-label="Film continuum journey"
    >
      <span id="journey-dive" className="journey-beat" style={{ top: '10%' }} aria-hidden />
      <span id="journey-transit" className="journey-beat" style={{ top: '42%' }} aria-hidden />
      <span id="journey-mars" className="journey-beat" style={{ top: '74%' }} aria-hidden />
      <span id="journey-last-light" className="journey-beat" style={{ top: '88%' }} aria-hidden />
      <div className={`journey-hud ${label === 'LAST LIGHT' ? 'is-last-light' : ''} ${silenceAct ? 'is-silence' : ''}`} aria-hidden>
        <span className="section-rail journey-hud__rail">FILM · CONTINUUM</span>
        <p className="journey-hud__act mono">{label}</p>
        <p className="journey-hud__phase">{phase}</p>
        <div className="journey-hud__meter" data-label={label}>
          <span className="journey-hud__meter-fill" ref={meterFillRef} />
        </div>
      </div>
      {silence && (
        <SilenceCoda />
      )}
    </section>
  )
}

/** Voyager silence beat — Pale Blue Dot + tear-level farewell */
function SilenceCoda() {
  const [dotOpen, setDotOpen] = useState(false)
  return (
    <div className="silence-coda" aria-live="polite">
      <div className="silence-coda__sky">
        <div className="pale-blue-stage">
          <div
            className="pale-blue-field"
            style={{ backgroundImage: 'url(/images/pale-blue-dot-revisited.jpg)' }}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`pale-blue-hotspot${dotOpen ? ' is-on' : ''}`}
            aria-expanded={dotOpen}
            aria-controls="pale-blue-card"
            aria-label="Pale Blue Dot — Earth from 6 billion kilometers"
            onClick={() => setDotOpen((v) => !v)}
          >
            <span className="pale-blue-hotspot__ring" />
            <span className="pale-blue-hotspot__ring pale-blue-hotspot__ring--delay" />
            <span className="pale-blue-hotspot__core" />
          </button>
          {dotOpen && (
            <aside id="pale-blue-card" className="pale-blue-card" role="dialog" aria-label="Pale Blue Dot">
              <p className="mono pale-blue-card__kicker">EARTH · 6 BILLION KM · 14 FEB 1990</p>
              <p className="pale-blue-card__line">
                A single pixel in a ray of sunlight. Everyone you love. Everyone you will ever meet.
              </p>
              <a
                className="mono pale-blue-card__link"
                href="https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot/"
                target="_blank"
                rel="noreferrer"
              >
                NASA · PALE BLUE DOT ↗
              </a>
              <span className="pale-blue-card__credit">NASA / JPL-Caltech · Pale Blue Dot Revisited</span>
            </aside>
          )}
        </div>
      </div>

      <div className="silence-coda__copy">
        <p className="silence-coda__kicker mono">VOYAGER 1 · FINAL LOOK HOME</p>
        <h2 className="silence-coda__title display">
          I turned once.
          <span className="silence-coda__title-soft"> Home was a tear of blue.</span>
        </h2>
        <p className="silence-coda__lede">
          Six billion kilometers behind me, everything I was built to leave —
          every voice, every ocean, every quiet kitchen light — lived on a mote of dust
          suspended in a sunbeam. I looked back once. Then I kept going into the dark,
          still carrying your names on a golden record, still calling home.
        </p>
        <p className="silence-coda__hint mono">Tap the pale blue pixel — that is Earth.</p>
      </div>
      <LightDayCountdown compact className="light-day--silence" />
    </div>
  )
}

function Hero({ ready, reduced, onOpen }) {
  const { setLabel } = useCursor()
  const rootRef = useRef(null)
  const shortViewport = useMediaQuery('(max-height: 719px)')
  const coarse = useIsCoarse()
  useEffect(() => {
    if (!ready || reduced) return undefined
    const delay = ranged(0.05, 0.18, 7)
    return playHeroIntro(rootRef.current, { reduced, seedDelay: delay })
  }, [ready, reduced])

  return (
    <section className="hero" id="top" aria-label="Hero" ref={rootRef}>
      <div className="hero-content">
        <p className="kicker" data-hero-kicker style={{ marginBottom: '0.85rem', opacity: ready ? undefined : 1 }}>
          NASA SPACE APPS 2026 · DISCARDED EQUIPMENT STORYTELLING
        </p>
        <h1 className="display display-xl" style={{ marginBottom: '0.55rem' }} aria-label="Silent Fleet">
          {ready ? (
            <>
              <BlurText
                as="span"
                text="SILENT"
                className="hero-line hero-line--blur"
                animateBy="letters"
                direction="bottom"
                delay={ranged(28, 48, 11)}
                trigger="load"
                effect="blur"
              />
              <span className="hero-line" data-hero-line>
                <GradientText
                  colors={['#e8eef5', '#8ec8ff', '#ff7a45', '#e8eef5']}
                  animationSpeed={ranged(6, 10, 13)}
                  followPointer
                  className="hero-gradient-fleet"
                >
                  FLEET
                </GradientText>
              </span>
            </>
          ) : (
            <>
              <span className="hero-line">SILENT</span>
              <span className="hero-line grad-text">FLEET</span>
            </>
          )}
        </h1>
        <span className="sr-only">Silent Fleet — Abandoned but not Forgotten</span>
        <p
          className="hero-challenge-line"
          data-hero-kicker
          style={{ opacity: ready ? undefined : 1 }}
        >
          {ready ? (
            <DecryptedText
              text="Abandoned but not Forgotten"
              animateOn="view"
              sequential
              speed={32}
              maxIterations={8}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·"
              className="hero-challenge-line__glyph"
              parentClassName="hero-challenge-line__decrypt"
              encryptedClassName="hero-challenge-line__cipher"
              scrambleColor="#8ec8ff"
            />
          ) : (
            'Abandoned but not Forgotten'
          )}
        </p>
        <div data-hero-body style={{ marginBottom: '1.35rem', maxWidth: '40ch' }}>
          <p className="hero-body-blur" style={{ color: 'var(--ink-dim)', fontSize: 'clamp(1.05rem, 2.4vw, 1.3rem)', lineHeight: 1.5, margin: 0 }}>
            They were built to listen, dig, and wander — then left behind. Hear them speak. Remember who stayed so we could learn.
          </p>
        </div>
        <div data-hero-cta style={{ opacity: ready ? undefined : 1, marginTop: '0.35rem' }}>
          <Magnet
            padding={80}
            magnetStrength={2.4}
            maxOffset={18}
            disabled={shortViewport || coarse || reduced}
          >
            <GlareHover
              width="auto"
              height="auto"
              background="transparent"
              borderRadius="999px"
              borderColor="transparent"
              glareColor="#8ec8ff"
              glareOpacity={shortViewport || coarse ? 0 : 0.32}
              transitionDuration={650}
            >
              <MagneticButton
                href="#objective"
                onMouseEnter={() => setLabel('ENTER')}
                onMouseLeave={() => setLabel('')}
              >
                MEET THE LEFTOVERS
              </MagneticButton>
            </GlareHover>
          </Magnet>
        </div>
      </div>

      {/* Hero keeps Moon stage only — NASA leftover plate lives in Objective, not here */}

      <div className="hero-scroll-cue" data-hero-cue aria-hidden style={{ opacity: ready ? undefined : 0.7 }}>
        <ShinyText
          text="SCROLL THE JOURNEY"
          color="#8b93a7"
          shineColor="#e8eef5"
          speed={2.4}
          shineWidth={36}
          softness={0.85}
          trigger="loop"
          className="hero-scroll-cue__shine"
        />
        <span className="streak"><i /></span>
      </div>
    </section>
  )
}

function ChallengeObjective({ reduced }) {
  const rootRef = useRef(null)
  const coarse = useIsCoarse()
  useEffect(() => revealOnScroll(rootRef.current, { reduced }), [reduced])
  return (
    <section className="section challenge-objective" id="objective" ref={rootRef} aria-label="Challenge objective">
      <span className="section-rail" data-reveal>01 · OBJECTIVE</span>
      <span className="section-num" aria-hidden>01</span>
      <p className="kicker" data-reveal style={{ marginBottom: '0.85rem' }}>
        <DecryptedText
          text="NASA SPACE APPS 2026 · ABANDONED BUT NOT FORGOTTEN"
          animateOn="view"
          sequential
          speed={reduced || coarse ? 18 : 28}
          maxIterations={reduced || coarse ? 4 : 10}
          characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·"
          className="objective-decrypt__glyph"
          parentClassName="objective-decrypt"
          encryptedClassName="objective-decrypt__cipher"
          scrambleColor="#8ec8ff"
        />
      </p>
      <div className="objective-hero-row" data-reveal>
        <div className="objective-focus-wrap">
          {reduced || coarse ? (
            <h2 className="display objective-headline">
              They stayed behind{' '}
              <span className="outline-text">so we could learn.</span>
            </h2>
          ) : (
            <TrueFocus
              sentence="They stayed behind so we could learn."
              borderColor="#8ec8ff"
              glowColor="rgba(142, 200, 255, 0.35)"
              blurAmount={4}
              animationDuration={0.55}
              pauseBetweenAnimations={1.15}
              cornerSize={14}
              borderWidth={2}
              unfocusedOpacity={0.42}
            />
          )}
        </div>
        <div className="objective-figure-fade">
          <div className="objective-figure">
            <DecayCard
              className="objective-decay"
              image="/images/eagle-aldrin-portrait.jpg"
              width="100%"
              height="auto"
              style={{ aspectRatio: '3 / 4', maxHeight: 'min(62vh, 560px)' }}
              intensity={reduced || coarse ? 0.12 : 0.36}
              sensitivity={reduced || coarse ? 0.25 : 0.42}
              hoverDecay={0.07}
              recovery={0.72}
              grain={0.32}
              detail={5}
              pattern={4}
              idle={reduced || coarse ? 0 : 0.2}
              flow={0}
              chroma={0}
              travel={reduced || coarse ? 0 : 26}
              tilt={reduced || coarse ? 0 : 5}
              scope="card"
              radius={0}
            >
              <p className="mono objective-decay__credit">
                {HERO_LEFTOVER?.credit || 'NASA / Apollo 11'} · {HERO_LEFTOVER?.coords || '0.67416° N, 23.47314° E'}
              </p>
            </DecayCard>
            <p className="mono objective-figure__caption">
              Buzz Aldrin · Tranquility Base · still on the Moon
            </p>
          </div>
        </div>
      </div>
      <div className="objective-copy" data-reveal>
        <LineReveal>
          <span style={{ color: 'var(--ink-dim)', fontSize: '1.12rem', lineHeight: 1.7, display: 'block' }}>
            Since the 1960s, NASA has left teammates across the solar system — landers that dug for ice,
            rovers that tasted ancient lakes, probes that still phone home from the dark.
            The Catalogue of Manmade Material on the Moon alone lists hundreds still sitting in the dust.
          </span>
        </LineReveal>
        <LineReveal delay={0.08}>
          <span style={{ color: 'var(--ink-dim)', fontSize: '1.12rem', lineHeight: 1.7, display: 'block', marginTop: '1.1rem' }}>
            This challenge asks us to feel them as explorers, not scrap — to remember the science they gave us,
            and to leave changed. Accuracy matters: every coordinate ties to NSSDCA, LROC, ALSJ, HiRISE, or PDS.
          </span>
        </LineReveal>
        <div className="objective-cta-row">
          <MagneticButton href="#atlas" className="objective-cta">
            ENTER THE ATLAS
          </MagneticButton>
          <p className="mono objective-link-row">
            <a
              href="https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details"
              target="_blank"
              rel="noreferrer"
            >
              CHALLENGE DETAILS ↗
            </a>
            <a href="#fleet">BROWSE NASA LEFTOVERS →</a>
          </p>
        </div>
      </div>
    </section>
  )
}

/** Atlas chapter title — lives with the Moon (second image), not under Objective’s Eagle still */
function AtlasBridgeHeading({ atlasActive }) {
  return (
    <header
      className={`atlas-heading atlas-heading--bridge ${atlasActive ? 'is-atlas' : 'is-waiting'}`}
      id="atlas-bridge"
      aria-label="Where they still sit"
      aria-hidden={!atlasActive}
    >
      <p className="kicker">
        {atlasActive ? (
          <DecryptedText
            text="IMAGE PLACEMENT · RESPECT THE COORDINATES"
            animateOn="view"
            sequential
            speed={22}
            maxIterations={8}
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·"
            scrambleColor="#8ec8ff"
          />
        ) : (
          <ScrambleLine text="IMAGE PLACEMENT · RESPECT THE COORDINATES" active={false} />
        )}
      </p>
      <h2 className="display atlas-title">
        Where they <span className="outline-text">still sit</span>
      </h2>
      <p className="atlas-lede">
        Sites are pinned to Mean Earth / Polar Axis coordinates (NSSDC / LROC).
        Hover a hotspot on the Moon for the NASA image and exact location.
      </p>
      {atlasActive && (
        <p className="atlas-drag-cue mono" aria-live="polite">
          <span className="atlas-drag-cue__orb" aria-hidden />
          Hover + scroll the wheel or globe to rotate · drag also works
        </p>
      )}
    </header>
  )
}

/** Left-side Mars hotspot wheel — selects a site and aims the globe */
function MarsHotspotWheel({ active, selectedId, onSelect }) {
  const foundIdx = MARS_HOTSPOT_SITES.findIndex((s) => s.id === selectedId)
  const selectedIdx = foundIdx >= 0
    ? foundIdx
    : Math.max(0, MARS_HOTSPOT_SITES.findIndex((s) => s.id === 'opportunity'))
  return (
    <div
      className={`mars-hotspot-wheel-hud ${active ? 'is-on' : ''}`}
      aria-hidden={!active}
      aria-label="Mars hotspot wheel"
    >
      <p className="kicker mars-hotspot-wheel-kicker">MARS · HOTSPOTS</p>
      {active && (
        <OptionWheel
          key="mars-hotspot-wheel"
          items={MARS_HOTSPOT_LABELS}
          defaultSelected={selectedIdx}
          selected={selectedIdx}
          textColor="#8a8680"
          activeColor="#ffe0c8"
          side="left"
          fontSize={2.05}
          spacing={1.72}
          curve={2.35}
          tilt={14}
          blur={1.35}
          fade={0.18}
          minOpacity={0.12}
          smoothing={520}
          inset={28}
          loop={false}
          draggable
          soundUrl=""
          className="mars-hotspot-wheel"
          aria-label="Mars hotspot selector"
          onChange={(index) => {
            const site = MARS_HOTSPOT_SITES[index]
            if (site) onSelect?.(site)
          }}
        />
      )}
    </div>
  )
}

/** Moon Atlas wheel — phone/desktop picker matching Mars grammar (ice grade) */
function MoonHotspotWheel({ active, selectedId, onSelect }) {
  const foundIdx = MOON_HOTSPOT_SITES.findIndex((s) => s.id === selectedId)
  const selectedIdx = foundIdx >= 0
    ? foundIdx
    : Math.max(0, MOON_HOTSPOT_SITES.findIndex((s) => s.id === 'a11-lm'))
  return (
    <div
      className={`moon-hotspot-wheel-hud ${active ? 'is-on' : ''}`}
      aria-hidden={!active}
      aria-label="Moon hotspot wheel"
    >
      <p className="kicker moon-hotspot-wheel-kicker">MOON · HOTSPOTS</p>
      {active && (
        <OptionWheel
          key="moon-hotspot-wheel"
          items={MOON_HOTSPOT_LABELS}
          defaultSelected={selectedIdx}
          selected={selectedIdx}
          textColor="#7a8496"
          activeColor="#d7ebff"
          side="left"
          fontSize={1.85}
          spacing={1.58}
          curve={2.2}
          tilt={12}
          blur={1.2}
          fade={0.16}
          minOpacity={0.12}
          smoothing={520}
          inset={28}
          loop={false}
          draggable
          soundUrl=""
          className="moon-hotspot-wheel"
          aria-label="Moon hotspot selector"
          onChange={(index) => {
            const site = MOON_HOTSPOT_SITES[index]
            if (site) onSelect?.(site)
          }}
        />
      )}
    </div>
  )
}

function LocationAtlas({ onActiveChange, onFocusSite, onCardSite, cardSiteId }) {
  const sectionRef = useRef(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    let wasOn = false
    const io = new IntersectionObserver(
      ([entry]) => {
        // Lock when Atlas (Moon) is the active chapter — title stays with this section
        const on = !!entry?.isIntersecting && entry.intersectionRatio >= 0.18
        onActiveChange?.(on)
        if (on && !wasOn) {
          onFocusSite?.('a11-lm')
          onCardSite?.('a11-lm')
        }
        if (!on && wasOn) onCardSite?.(null)
        wasOn = on
      },
      { threshold: [0, 0.12, 0.18, 0.35, 0.55], rootMargin: '8% 0px -38% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onActiveChange, onCardSite, onFocusSite])

  return (
    <section
      ref={sectionRef}
      className="section location-atlas body-moon is-active"
      id="atlas"
      aria-label="Hardware locations"
    >
      <span className="section-rail">02B · ATLAS</span>
      <span className="section-num" aria-hidden>LOC</span>
      <AtlasBridgeHeading atlasActive />
      <FadeContent className="atlas-stage-dock" blur duration={0.85} threshold={0.12} once>
        <p className="kicker atlas-stage-dock__kicker">
          <DecryptedText
            text="LUNAR HARDWARE · SURVEYED SITES"
            animateOn="view"
            sequential
            speed={24}
            maxIterations={8}
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·"
            scrambleColor="#8ec8ff"
          />
        </p>
        <p className="atlas-stage-dock__lede">
          Drag the Moon. Choose a leftover from the ice wheel — then keep scrolling the continuum into Meridiani Planum.
        </p>
        <p className="mono atlas-stage-dock__meta">{MOON_HOTSPOT_SITES.length} SITES · NASA CATALOGUE · LROC</p>
      </FadeContent>
    </section>
  )
}

function Fleet({ onOpen }) {
  const rootRef = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) setInView(true) },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={rootRef}
      className="fleet-folio"
      id="fleet"
      aria-label="Silent fleet leftovers"
    >
      <span className="fleet-folio__rail mono" aria-hidden>03 · FLEET</span>
      <span className="fleet-folio__num" aria-hidden>03</span>

      <div className="fleet-folio__wordmark">
        <SplitText
          text="Fifteen voices."
          tag="h2"
          className="fleet-folio__title display"
          splitType="chars"
          effect="rise"
          trigger="view"
          delay={26}
          duration={1.15}
          textAlign="center"
        />
        <p className="fleet-folio__outline outline-text display">One silent fleet.</p>
      </div>

      <p className="fleet-folio__lede">
        Spine out on the shelf. The active leftover turns to face you — full NASA cover, dossier proportions.
        Click the cover to listen.
      </p>

      {inView ? (
        <Suspense fallback={<p className="mono" style={{ textAlign: 'center', opacity: 0.45 }}>ASSEMBLING NASA SHELF…</p>}>
          <FleetShelf onSelect={onOpen} />
        </Suspense>
      ) : (
        <p className="mono" style={{ textAlign: 'center', opacity: 0.35, marginTop: '2rem' }}>SCROLL TO REVEAL THE FLEET</p>
      )}
    </section>
  )
}

/** Prefer a calm English voice for hardware monologues. */
function pickHardwareVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices?.length) return null
  const prefer = [
    /samantha/i, /karen/i, /moira/i, /google uk english female/i,
    /google us english/i, /microsoft aria/i, /microsoft jenny/i, /english/i,
  ]
  for (const re of prefer) {
    const hit = voices.find((v) => re.test(v.name) && /^en/i.test(v.lang || 'en'))
    if (hit) return hit
  }
  return voices.find((v) => /^en/i.test(v.lang || '')) || voices[0]
}

function stopHardwareSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

/** Self-reading tool — speaks a creative monologue, mission marker, and factual story. */
function HardwareReader({ item, reading, onReadingChange }) {
  const supported = typeof window !== 'undefined' && !!window.speechSynthesis
  const script = useMemo(() => {
    if (!item) return ''
    const parts = []
    if (item.voice) parts.push(item.voice)
    if (item.transmission) parts.push(`Mission marker. ${item.transmission}.`)
    if (item.story) parts.push(item.story)
    return parts.join(' ')
  }, [item])

  useEffect(() => {
    if (!supported) return undefined
    // Chrome loads voices async
    const warm = () => { pickHardwareVoice() }
    warm()
    window.speechSynthesis.addEventListener?.('voiceschanged', warm)
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', warm)
      stopHardwareSpeech()
      onReadingChange?.(false)
    }
  }, [supported, onReadingChange])

  const toggle = () => {
    if (!supported || !script) return
    if (reading) {
      stopHardwareSpeech()
      onReadingChange?.(false)
      return
    }
    stopHardwareSpeech()
    const utter = new SpeechSynthesisUtterance(script)
    const voice = pickHardwareVoice()
    if (voice) utter.voice = voice
    utter.rate = 0.92
    utter.pitch = 0.95
    utter.lang = voice?.lang || 'en-US'
    utter.onend = () => onReadingChange?.(false)
    utter.onerror = () => onReadingChange?.(false)
    onReadingChange?.(true)
    window.speechSynthesis.speak(utter)
  }

  if (!supported) {
    return (
      <button type="button" className="hardware-reader" disabled title="Speech not available in this browser">
        READ UNAVAILABLE
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`hardware-reader${reading ? ' is-playing' : ''}`}
      onClick={toggle}
      aria-pressed={reading}
      aria-label={reading ? 'Stop reading dossier aloud' : 'Read dossier aloud'}
    >
      <span className="hardware-reader__dot" aria-hidden />
      {reading ? 'STOP' : 'LISTEN'}
    </button>
  )
}

function ArtifactModal({ item, onClose }) {
  const [phase, setPhase] = useState(0)
  const [reading, setReading] = useState(false)
  const panelRef = useRef(null)
  const onReadingChange = useCallback((v) => setReading(!!v), [])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80)
    const t2 = setTimeout(() => setPhase(2), 220)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    pauseScrollEngine()
    requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.scrollTop = 0
    })
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      resumeScrollEngine()
      stopHardwareSpeech()
    }
  }, [onClose, item?.id])

  // Keep wheel/touch on the panel — Lenis otherwise owns the page scroll
  const keepScrollLocal = useCallback((e) => {
    e.stopPropagation()
  }, [])

  if (!item) return null
  return createPortal(
    <motion.div
      className="modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="modal-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        className="modal-wipe"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      />
      <motion.div
        ref={panelRef}
        className="modal-panel glass-3"
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        onWheel={keepScrollLocal}
        onTouchMove={keepScrollLocal}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dossier">×</button>
        <motion.p className="kicker" initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0 }}>
          {item.body.toUpperCase()} · {item.year} · {item.status}
        </motion.p>
        <motion.h2
          id="dossier-title"
          className="display"
          style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', margin: '0.5rem 0' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: 0 }}
        >
          {item.name}
        </motion.h2>
        <p className="mono" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--ink-mute)', marginBottom: '1rem' }}>
          {item.codename} · {item.coords}
        </p>
        {item.image && (
          <div className={`nasa-media${item.imagePortrait ? ' nasa-media--portrait' : ''}`}>
            <img src={item.image} alt={item.imageAlt || item.name} loading="lazy" />
            <span className="credit">{item.credit}</span>
          </div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }}>
          {item.voice && (
            <blockquote className={`dossier-voice${reading ? ' is-reading' : ''}`}>
              <div className="dossier-voice__head">
                <p className="mono dossier-voice__label">CREATIVE MONOLOGUE · NOT A RECORDING</p>
                <HardwareReader item={item} reading={reading} onReadingChange={onReadingChange} />
              </div>
              <p>“{item.voice}”</p>
            </blockquote>
          )}
          {!item.voice && item.story && (
            <blockquote className={`dossier-voice${reading ? ' is-reading' : ''}`}>
              <div className="dossier-voice__head">
                <p className="mono dossier-voice__label">THE HARDWARE SPEAKS</p>
                <HardwareReader item={item} reading={reading} onReadingChange={onReadingChange} />
              </div>
              <p>“{item.story}”</p>
            </blockquote>
          )}
          {item.voice && item.story && (
            <p style={{ color: 'var(--ink-dim)', lineHeight: 1.65, marginBottom: '1rem' }}>{item.story}</p>
          )}
          <p style={{ color: 'var(--ice)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', letterSpacing: '0.04em', marginBottom: '1rem' }}>
            {item.transmission}
          </p>
          <p style={{ color: 'var(--ink-mute)', fontSize: '0.9rem', lineHeight: 1.55 }}>{item.science}</p>
          {item.id === 'voyager1' && (
            <LightDayCountdown compact className="light-day--dossier" />
          )}
          <div className="nasa-links">
            {item.source && <a href={item.source} target="_blank" rel="noreferrer">NASA IMAGE ↗</a>}
            {item.orbital && <a href={item.orbital} target="_blank" rel="noreferrer">ORBITAL CONTEXT ↗</a>}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function Footer() {
  const utc = useUTCClock()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <footer className="footer" ref={ref}>
      <FadeContent blur duration={0.9} threshold={0.2} once>
        <div className="footer-mark holo-foil">
          <ShinyText
            text="SILENT FLEET"
            color="#e8eef5"
            shineColor="#8ec8ff"
            speed={3.2}
            shineWidth={42}
            softness={0.9}
            trigger="view"
            className="footer-mark__shine"
          />
        </div>
        <div className="footer-links resources-strip">
          {NASA_RESOURCES.map((r) => (
            <a key={r.href} className="glass-2" href={r.href} target="_blank" rel="noreferrer">
              {r.label.toUpperCase()} ↗
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'end' }}>
          <div>
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--ink-mute)', marginBottom: 8 }}>MISSION CLOCK · {utc}</div>
            <p className="mono" style={{ fontSize: '0.85rem', letterSpacing: '0.08em' }}>
              {inView ? (
                <DecryptedText
                  text="THEY ARE STILL OUT THERE. SOME STILL SPEAK."
                  animateOn="view"
                  sequential
                  speed={26}
                  maxIterations={10}
                  characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789."
                  scrambleColor="#8ec8ff"
                />
              ) : (
                <ScrambleLine text="THEY ARE STILL OUT THERE. SOME STILL SPEAK." active={false} />
              )}
              <span className="status-dot live" style={{ marginLeft: 10, verticalAlign: 'middle' }} />
            </p>
            <p style={{ color: 'var(--ink-mute)', fontSize: '0.75rem', marginTop: 12, maxWidth: 520, lineHeight: 1.5 }}>
              Built for NASA Space Apps 2026 — “Abandoned but not Forgotten.”
              Facts cross-checked against NSSDCA, LROC, ALSJ, HiRISE & PDS.
              Procedural visuals · AI-assisted code disclosed per challenge guidelines.
            </p>
          </div>
          <MagneticButton href="#top">RETURN TO SURFACE</MagneticButton>
        </div>
      </FadeContent>
    </footer>
  )
}

function CursorProvider({ children }) {
  const coarse = useIsCoarse()
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(true)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, { stiffness: 550, damping: 40 })
  const ry = useSpring(y, { stiffness: 550, damping: 40 })
  const ringX = useSpring(x, { stiffness: 160, damping: 24 })
  const ringY = useSpring(y, { stiffness: 160, damping: 24 })
  const trailRefs = useRef([])

  useEffect(() => {
    document.body.classList.toggle('is-coarse', coarse)
  }, [coarse])

  useEffect(() => {
    if (coarse) return undefined
    let mx = -100
    let my = -100
    const trail = Array.from({ length: 5 }, () => ({ x: -100, y: -100 }))
    const move = (e) => {
      mx = e.clientX
      my = e.clientY
      x.set(mx)
      y.set(my)
    }
    let raf
    const loop = () => {
      let px = mx
      let py = my
      trail.forEach((t, i) => {
        const ease = 0.22 - i * 0.03
        t.x += (px - t.x) * ease
        t.y += (py - t.y) * ease
        px = t.x
        py = t.y
        const el = trailRefs.current[i]
        if (el) {
          el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${1 - i * 0.14})`
          el.style.opacity = String(0.45 - i * 0.07)
        }
      })
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [coarse, x, y])

  const api = useMemo(() => ({ setLabel, setVisible }), [])

  return (
    <CursorCtx.Provider value={api}>
      {children}
      {!coarse && visible && createPortal(
        <div className={`sf-cursor ${label ? 'has-label' : ''}`} aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="sf-cursor-trail"
              ref={(el) => { trailRefs.current[i] = el }}
            />
          ))}
          <motion.div style={{ position: 'fixed', left: 0, top: 0, x: rx, y: ry, width: 6, height: 6, borderRadius: '50%', background: '#fff', marginLeft: -3, marginTop: -3, pointerEvents: 'none', zIndex: 10001, mixBlendMode: 'difference' }} />
          <motion.div style={{
            position: 'fixed', left: 0, top: 0, x: ringX, y: ringY,
            width: label ? 'auto' : 36, height: label ? 'auto' : 36,
            marginLeft: label ? 0 : -18, marginTop: label ? 0 : -18,
            border: label ? 'none' : '1px solid rgba(255,255,255,0.7)',
            borderRadius: 999,
            padding: label ? '0.45rem 0.75rem' : 0,
            background: label ? 'rgba(255,255,255,0.14)' : 'transparent',
            backdropFilter: label ? 'blur(12px)' : undefined,
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.16em',
            color: '#fff', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 10001, mixBlendMode: 'difference',
            transform: label ? 'translate(-50%, -50%)' : undefined,
          }}
          >
            {label || null}
          </motion.div>
        </div>,
        document.body,
      )}
    </CursorCtx.Provider>
  )
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState(null)
  const [audioOn, setAudioOn] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [actLabel, setActLabel] = useState('ARRIVAL')
  const [atlasLock, setAtlasLock] = useState(false)
  const [marsLock, setMarsLock] = useState(false)
  const [chromeKill, setChromeKill] = useState(0)
  const [focusSiteId, setFocusSiteId] = useState('a11-lm')
  const [cardSiteId, setCardSiteId] = useState(null)
  const mainRef = useRef(null)
  const soundRef = useRef(null)
  const moonReadyResolve = useRef(null)
  const journeyPlayingRef = useRef(false)
  const killJourneyRef = useRef(null)
  const moonReadyPromise = useMemo(
    () => new Promise((resolve) => { moonReadyResolve.current = resolve }),
    [],
  )
  const mouse = useMouse()
  const mobile = useMediaQuery('(max-width: 768px)')
  const reduced = usePrefersReduced()
  // Nav meter follows owned film tip (synced from filmProgressRef)
  const filmMv = useMotionValue(0)
  useEffect(() => {
    let id = 0
    const tick = () => {
      filmMv.set(filmProgressRef.current)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [filmMv])

  useEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-sf', 'global')
    style.textContent = GLOBAL_CSS + FLEET_SHELF_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  useEffect(() => {
    soundRef.current = createSoundscape()
    return () => soundRef.current?.dispose()
  }, [])

  // Start texture + chunk warm immediately on first paint
  useEffect(() => {
    preloadContinuumModule()
    preloadCriticalMoon(mobile)
    preloadPlanetTextures(mobile)
    preloadMarsAndVoyager(mobile)
  }, [mobile])

  const onFilmSample = useCallback((sample) => {
    if (sample?.label) setActLabel((prev) => (prev === sample.label ? prev : sample.label))
    const kill = sample?.chromeKill ?? 0
    setChromeKill((prev) => (Math.abs(prev - kill) < 0.02 ? prev : kill))
    const tip = filmProgressRef.current || 0
    // Film tip past dive owns the stage — clear Atlas freeze so Meridiani can land
    if (tip >= FILM_MARKERS.dive) {
      setAtlasLock((prev) => (prev ? false : prev))
    }
    const atlasBlocks = tip < FILM_MARKERS.dive && atlasLock
    // Mars HUD only while film focus is Meridiani/storm — impossible on Recover (film tip ≥ 1)
    const marsOn = !atlasBlocks && (sample?.focus === 'mars' || sample?.focus === 'storm')
    setMarsLock((prev) => (prev === marsOn ? prev : marsOn))
    if (!marsOn) {
      setCardSiteId((id) => {
        const cur = ARTIFACTS.find((a) => a.id === id)
        return cur?.body === 'mars' ? null : id
      })
    }
  }, [atlasLock])

  const onMoonReady = useCallback(() => {
    moonReadyResolve.current?.()
  }, [])

  const onAtlasActive = useCallback((on) => {
    // Journey cinematic owns the stage — don't let Atlas IO re-freeze the film
    if (journeyPlayingRef.current) {
      setAtlasLock(false)
      return
    }
    // Once the film tip leaves Near Side, Atlas IO must not keep Mars locked out
    if (on && filmProgressRef.current >= FILM_MARKERS.dive) {
      setAtlasLock(false)
      return
    }
    setAtlasLock(on)
    if (on) setMarsLock(false)
    if (!on) setCardSiteId(null)
  }, [])

  const onMarsActive = useCallback((on) => {
    setMarsLock(!!on)
    if (on) {
      setFocusSiteId((id) => {
        const cur = ARTIFACTS.find((a) => a.id === id)
        return cur?.body === 'mars' ? id : 'opportunity'
      })
      setCardSiteId((id) => {
        const cur = ARTIFACTS.find((a) => a.id === id)
        return cur?.body === 'mars' ? id : 'opportunity'
      })
    } else {
      setCardSiteId((id) => {
        const cur = ARTIFACTS.find((a) => a.id === id)
        return cur?.body === 'mars' ? null : id
      })
    }
  }, [])

  const onNavAtlas = useCallback((e) => {
    e?.preventDefault?.()
    killJourneyRef.current?.()
    killJourneyRef.current = null
    journeyPlayingRef.current = false
    setAtlasLock(true)
    setMarsLock(false)
    setFocusSiteId('a11-lm')
    setCardSiteId('a11-lm')
    createFilmRail()
    scheduleScrollRefresh(0)
    // One frame so ScrollTrigger measures the rail before scrub
    requestAnimationFrame(() => {
      scrollToFilmMarker('atlas', { duration: 1.1 })
    })
    history.replaceState(null, '', '#atlas')
  }, [])

  const onNavJourney = useCallback((e) => {
    e?.preventDefault?.()
    killJourneyRef.current?.()
    journeyPlayingRef.current = true
    setAtlasLock(false)
    setMarsLock(false)
    setCardSiteId(null)
    setFocusSiteId('a11-lm')
    history.replaceState(null, '', '#journey')
    createFilmRail()
    scheduleScrollRefresh(0)
    requestAnimationFrame(() => {
      killJourneyRef.current = playMoonToMarsJourney({
        reduced,
        onStart: () => {
          journeyPlayingRef.current = true
          setAtlasLock(false)
        },
        onComplete: () => {
          journeyPlayingRef.current = false
          setFocusSiteId('opportunity')
          setCardSiteId('opportunity')
          killJourneyRef.current = null
        },
      })
    })
  }, [reduced])

  /** Fleet — soft continuum coda (not a hard brochure jump mid-film). */
  const onNavCoda = useCallback((e) => {
    e?.preventDefault?.()
    killJourneyRef.current?.()
    killJourneyRef.current = null
    journeyPlayingRef.current = false
    setAtlasLock(false)
    setMarsLock(false)
    setCardSiteId(null)
    // Park film at silence tip so Meridiani HUD cannot ghost through coda
    createFilmRail()
    scheduleScrollRefresh(0)
    requestAnimationFrame(() => {
      scrollToFilmMarker('silence', { immediate: true })
      scrollToHash('#fleet', { duration: 1.15, offset: -72 })
    })
    history.replaceState(null, '', '#fleet')
  }, [])

  const onFocusSite = useCallback((id) => {
    if (id) setFocusSiteId(id)
  }, [])

  const onMarsHotspotSelect = useCallback((site) => {
    setFocusSiteId(site.id)
    setCardSiteId(site.id)
  }, [])

  // Limb-echo / far-side reveal — rotate the globe to bring that site onto the lens
  const onHotspotReveal = useCallback((site) => {
    if (!site?.id) return
    setFocusSiteId(site.id)
    setCardSiteId(site.id)
  }, [])

  // Hover opens the card only — never retarget moon/mars aim (that made pins chase the cursor)
  const onHotspotHover = useCallback((site) => {
    setCardSiteId(site.id)
  }, [])

  const onHotspotLeave = useCallback((site) => {
    setCardSiteId((id) => (id === site.id ? null : id))
  }, [])

  useEffect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    if (booting) return undefined
    createScrollEngine()
    createFilmRail()
    getSessionSeed()
    scheduleScrollRefresh(200)
    const onLoad = () => {
      scheduleScrollRefresh(80)
      createFilmRail()
    }
    window.addEventListener('load', onLoad)
    return () => {
      window.removeEventListener('load', onLoad)
      killJourneyRef.current?.()
      killJourneyRef.current = null
      journeyPlayingRef.current = false
      destroyScrollEngine()
    }
  }, [booting])

  const onBootDone = useCallback(() => {
    // Always land on hero — never restore mid-page / hash scroll
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    setBooting(false)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      setReady(true)
    })
  }, [])

  const openDossier = useCallback((item) => {
    setSelected(item)
  }, [])

  const toggleAudio = useCallback(async () => {
    const s = soundRef.current
    if (!s) return
    if (audioOn) {
      s.setEnabled(false)
      setAudioOn(false)
      return
    }
    setAudioLoading(true)
    try {
      const enabled = await s.setEnabled(true)
      if (!enabled) {
        setAudioError(true)
        return
      }
      setAudioOn(true)
      setAudioError(false)
    } catch (error) {
      console.error('Unable to start the ambient soundscape:', error)
      setAudioError(true)
    } finally {
      setAudioLoading(false)
    }
  }, [audioOn])

  return (
    <CursorProvider>
      <ClickSpark
        sparkColor={['#8ec8ff', '#ff7a45', '#e8eef5']}
        sparkSize={12}
        sparkRadius={28}
        sparkCount={10}
        duration={520}
        easing="ease-out"
        glow={0.45}
        ring
        className="sf-spark-root"
        style={{ minHeight: '100%' }}
      >
        <div className={`sf-app${booting ? ' is-booting' : ''}`} ref={mainRef}>
          <FilmGrain reduced={reduced} />
          <ErrorBoundary fallback={<div className="canvas-fallback" style={{ position: 'fixed', inset: 0 }} />}>
            {/* Mount during preloader so 8K GPU upload overlaps boot choreography */}
            <Suspense fallback={<div className="canvas-fallback" style={{ position: 'fixed', inset: 0 }} />}>
              <ContinuumCanvas
                progress={filmMv}
                mouse={mouse}
                mobile={mobile}
                reduced={reduced}
                active={!booting}
                onSample={onFilmSample}
                onMoonReady={onMoonReady}
                onMarsActive={onMarsActive}
                atlasLock={atlasLock}
                marsLock={marsLock && !atlasLock}
                focusSiteId={focusSiteId}
                moonHotspotsInteractive={atlasLock}
                marsHotspotsInteractive={marsLock && !atlasLock && chromeKill < 0.55}
                cardSiteId={cardSiteId}
                onHotspotHover={onHotspotHover}
                onHotspotLeave={onHotspotLeave}
                onHotspotOpen={openDossier}
                onHotspotReveal={onHotspotReveal}
              />
            </Suspense>
          </ErrorBoundary>
          <div className="sf-veil" aria-hidden />

          <MoonHotspotWheel
            active={atlasLock && !booting}
            selectedId={focusSiteId}
            onSelect={onMarsHotspotSelect}
          />
          <MarsHotspotWheel
            active={marsLock && !atlasLock && !booting && chromeKill < 0.55}
            selectedId={focusSiteId}
            onSelect={onMarsHotspotSelect}
          />

          <a
            href="#journey"
            className="mono"
            style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
            onFocus={(e) => {
              e.currentTarget.style.left = '12px'
              e.currentTarget.style.top = '12px'
              e.currentTarget.style.width = 'auto'
              e.currentTarget.style.height = 'auto'
              e.currentTarget.style.zIndex = 200
              e.currentTarget.style.padding = '8px 12px'
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#000'
            }}
          >
            Skip to content
          </a>

          {booting && (
            <Preloader
              onDone={onBootDone}
              reduced={reduced}
              moonReady={moonReadyPromise}
            />
          )}

          <div
            className={`sf-chrome ${chromeKill > 0.08 ? 'is-dying' : ''}`}
            style={{ opacity: 1 - chromeKill * 0.92, pointerEvents: chromeKill > 0.72 ? 'none' : undefined }}
          >
            <Nav
              progress={filmMv}
              onNavAtlas={onNavAtlas}
              onNavJourney={onNavJourney}
              onNavCoda={onNavCoda}
            />

            <button
              type="button"
              className={`audio-toggle ${audioOn ? 'on' : ''}`}
              onClick={toggleAudio}
              aria-pressed={audioOn}
              aria-busy={audioLoading}
              aria-label={audioLoading ? 'Loading background ambience' : audioError ? 'Retry background ambience' : `Background ambience ${audioOn ? 'on' : 'off'}`}
              disabled={audioLoading}
            >
              {audioOn ? 'SOUND · ON' : 'SOUND'}
            </button>
          </div>

          <div className="sf-chapters">
            <ErrorBoundary fallback={<section className="hero"><div className="hero-content"><h1 className="display display-xl">SILENT FLEET</h1></div></section>}>
              <Hero ready={ready && !booting} reduced={reduced} onOpen={openDossier} />
            </ErrorBoundary>

            {/* Owned continuum rail — ScrollTrigger progress == filmProgress */}
            <div className="story-plate">
              <div id="continuum-rail" className="continuum-rail">
                <div className={`objective-atlas-band ${atlasLock ? 'is-atlas-live' : ''}`}>
                  <ErrorBoundary>
                    <ChallengeObjective reduced={reduced} />
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <LocationAtlas
                      locked={atlasLock}
                      onActiveChange={onAtlasActive}
                      onFocusSite={onFocusSite}
                      onCardSite={setCardSiteId}
                      cardSiteId={cardSiteId}
                    />
                  </ErrorBoundary>
                </div>

                <div className="story-seam story-seam--into-film" aria-hidden />

                <FilmJourney label={actLabel} />
              </div>

              <div className="story-seam story-seam--into-fleet" aria-hidden />

              <ErrorBoundary>
                <Fleet onOpen={openDossier} />
              </ErrorBoundary>
            </div>

            <Footer />
          </div>

          <AnimatePresence>
            {selected && (
              <ArtifactModal item={selected} onClose={() => setSelected(null)} />
            )}
          </AnimatePresence>

          <div className="sf-disclosure">AI-ASSISTED · NASA SPACE APPS 2026</div>
        </div>
      </ClickSpark>
    </CursorProvider>
  )
}

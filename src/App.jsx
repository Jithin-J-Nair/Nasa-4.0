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
import { preloadContinuumModule, preloadCriticalMoon, preloadPlanetTextures } from './world/preloadTextures'
import { GLOBAL_CSS } from './styles/global.css.js'
import {
  createScrollEngine, destroyScrollEngine, scrollToHash, playHeroIntro, playBootSequence,
  revealOnScroll, scheduleScrollRefresh, playMoonToMarsJourney,
  createFilmRail, filmProgressRef, scrollToFilmMarker, scrollToFilmProgress, setFilmProgress,
} from './motion/engine'
import { ranged, getSessionSeed } from './motion/seed'
import {
  Magnet, SpotlightCard, ClickSpark, FadeContent,
  GradientText, GlareHover, BlurText, TrueFocus, OptionWheel,
} from './bits'
import './bits/SpotlightCard/SpotlightCard.css'
import './bits/GradientText/GradientText.css'
import './bits/GlareHover/GlareHover.css'
import './bits/TrueFocus/TrueFocus.css'
import './bits/OptionWheel/OptionWheel.css'

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
const SPRING_SOFT = { stiffness: 90, damping: 24, mass: 1 }
const HEARTBEATS = ['opportunity', 'a11-lm', 'voyager1']
  .map((id) => ARTIFACTS.find((a) => a.id === id))
  .filter(Boolean)
const FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'moon', label: 'MOON' },
  { id: 'mars', label: 'MARS' },
  { id: 'deep', label: 'DEEP' },
  { id: 'active', label: 'LIVE' },
]
/** Hero challenge plate — NASA leftover hardware (Eagle LM) · Tranquility Base */
const HERO_LEFTOVER = ARTIFACTS.find((a) => a.id === 'a11-lm')
const MARS_HOTSPOT_SITES = ARTIFACTS.filter((a) => a.body === 'mars' && Number.isFinite(a.lat) && Number.isFinite(a.lon))
const MARS_HOTSPOT_LABELS = MARS_HOTSPOT_SITES.map((a) => a.name)
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
    const id = setInterval(() => setRem(lightDayRemaining()), 250)
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

  return (
    <Comp
      ref={ref}
      href={href}
      onClick={onClick}
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

function Preloader({ onDone, reduced, mobile, moonReady }) {
  const rootRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    let animDone = false
    let assetsDone = false
    let finished = false

    const finish = () => {
      if (cancelled || finished || !animDone || !assetsDone) return
      finished = true
      onDone?.()
    }

    // THREE.Cache + Continuum chunk + Moon maps; Mars warms in the background
    const assets = Promise.all([
      preloadCriticalMoon(mobile),
      preloadContinuumModule(),
      moonReady,
    ]).then(() => {
      assetsDone = true
      finish()
    }).catch(() => {
      assetsDone = true
      finish()
    })
    preloadPlanetTextures(mobile)

    const dur = ranged(1.7, 2.4, 3)
    const stopAnim = playBootSequence(rootRef.current, {
      reduced,
      duration: dur,
      onDone: () => {
        animDone = true
        finish()
      },
    })

    // Never trap the user if a texture host stalls
    const safety = window.setTimeout(() => {
      assetsDone = true
      finish()
    }, reduced ? 2500 : 16000)

    return () => {
      cancelled = true
      window.clearTimeout(safety)
      stopAnim?.()
      void assets
    }
  }, [onDone, reduced, mobile, moonReady])
  return (
    <div className="preloader" ref={rootRef}>
      <div className="preloader-panels" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} data-boot-panel style={{ transformOrigin: i % 2 ? 'bottom' : 'top' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <p className="kicker" data-boot-meta style={{ marginBottom: '1rem', color: 'var(--ice)' }}>
          CONTINUUM · LOCKING · SEED {String(getSessionSeed()).slice(-4)}
        </p>
        <div className="display" data-boot-brand style={{ fontSize: 'clamp(2.8rem, 9vw, 5.5rem)', letterSpacing: '-0.05em' }}>
          SILENT FLEET
        </div>
        <div className="boot-bar" aria-hidden><i data-boot-bar /></div>
        <p className="mono" data-boot-meta style={{ marginTop: '1.25rem', fontSize: '0.65rem', letterSpacing: '0.18em', color: 'var(--ink-mute)' }}>
          LOADING LUNAR SURFACE
        </p>
      </div>
    </div>
  )
}

function Nav({ progress, onNavAtlas, onNavJourney, onNavCoda }) {
  const scaleX = useSpring(progress, { stiffness: 90, damping: 24 })
  return (
    <nav className="nav" aria-label="Primary">
      <a href="#top" className="nav-brand" aria-label="Silent Fleet home">SILENT FLEET</a>
      <div className="nav-links">
        <a
          href="#objective"
          onClick={(e) => {
            e.preventDefault()
            scrollToHash('#objective', { duration: 1.05 })
          }}
        >
          OBJECTIVE
        </a>
        <a
          href="#atlas"
          onClick={(e) => {
            e.preventDefault()
            onNavAtlas?.(e)
          }}
        >
          ATLAS
        </a>
        <a
          href="#journey"
          onClick={(e) => {
            e.preventDefault()
            onNavJourney?.(e)
          }}
        >
          JOURNEY
        </a>
        <a
          href="#recover"
          onClick={(e) => {
            e.preventDefault()
            onNavCoda?.(e, 'recover')
          }}
        >
          RECOVER
        </a>
        <a
          href="#fleet"
          onClick={(e) => {
            e.preventDefault()
            onNavCoda?.(e, 'fleet')
          }}
        >
          FLEET
        </a>
      </div>
      <motion.div className="nav-progress" style={{ scaleX, width: '100%' }} />
    </nav>
  )
}

function FilmJourney({ label = 'JOURNEY' }) {
  const phase =
    label === 'NEAR PASS' || label === 'NEAR SIDE' ? 'Lunar zoom'
      : label === 'JOURNEY' ? 'Transit corridor'
        : label === 'MERIDIANI' || label === 'LAST LIGHT' || label === 'DUST STORM' ? 'Mars arrival'
          : 'Continuum'
  return (
    <section id="journey" className="journey-spacer" aria-label="Film continuum journey">
      <span id="journey-dive" className="journey-beat" style={{ top: '10%' }} aria-hidden />
      <span id="journey-transit" className="journey-beat" style={{ top: '42%' }} aria-hidden />
      <span id="journey-mars" className="journey-beat" style={{ top: '74%' }} aria-hidden />
      <span id="journey-last-light" className="journey-beat" style={{ top: '88%' }} aria-hidden />
      <div className={`journey-hud ${label === 'LAST LIGHT' ? 'is-last-light' : ''}`} aria-hidden>
        <span className="section-rail journey-hud__rail">FILM · CONTINUUM</span>
        <p className="journey-hud__act mono">{label}</p>
        <p className="journey-hud__phase">{phase}</p>
        <div className="journey-hud__meter" data-label={label}>
          <span className="journey-hud__meter-fill" />
        </div>
      </div>
    </section>
  )
}

/** Dev-only film scrubber — rehearse the five owned shots */
function FilmScrubber() {
  const [p, setP] = useState(() => filmProgressRef.current)
  useEffect(() => {
    let id = 0
    const tick = () => {
      setP(filmProgressRef.current)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])
  const jump = (v) => {
    createFilmRail()
    scheduleScrollRefresh(0)
    requestAnimationFrame(() => {
      scrollToFilmProgress(v, { immediate: true })
      setP(v)
    })
  }
  return (
    <div className="film-scrubber" role="group" aria-label="Film scrubber">
      <label className="mono" htmlFor="film-scrub">
        FILM {p.toFixed(3)}
      </label>
      <input
        id="film-scrub"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={p}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => jump(Number(e.target.value))}
      />
      <div className="film-scrubber__shots">
        {[
          ['ARRIVAL', 0.05],
          ['ATLAS', 0.155],
          ['LEAVE', 0.30],
          ['MARS', 0.56],
          ['LIGHT', 0.70],
        ].map(([label, tip]) => (
          <button
            key={label}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => jump(tip)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Hero({ ready, reduced, onOpen }) {
  const { setLabel } = useCursor()
  const rootRef = useRef(null)
  useEffect(() => {
    if (!ready || reduced) return undefined
    const delay = ranged(0.05, 0.18, 7)
    return playHeroIntro(rootRef.current, { reduced, seedDelay: delay })
  }, [ready, reduced])

  return (
    <section className="hero" id="top" aria-label="Hero" ref={rootRef}>
      <div className="hero-content">
        <p className="kicker" data-hero-kicker style={{ marginBottom: '1.15rem', opacity: ready ? undefined : 1 }}>
          NASA SPACE APPS 2026 · DISCARDED EQUIPMENT STORYTELLING
        </p>
        <p
          className="challenge-motto"
          data-hero-kicker
          style={{ opacity: ready ? undefined : 1 }}
        >
          Abandoned but not Forgotten
        </p>
        <h1 className="display display-xl" style={{ marginBottom: '1.1rem' }} aria-label="Silent Fleet">
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
        <div data-hero-body style={{ marginBottom: '1.5rem', maxWidth: '40ch' }}>
          <p className="hero-body-blur" style={{ color: 'var(--ink-dim)', fontSize: 'clamp(1.05rem, 2.4vw, 1.3rem)', lineHeight: 1.5, margin: 0 }}>
            They were built to listen, dig, and wander — then left behind. Hear them speak. Remember who stayed so we could learn.
          </p>
        </div>
        <div data-hero-cta style={{ opacity: ready ? undefined : 1, marginTop: '0.35rem' }}>
          <Magnet padding={80} magnetStrength={2.4} maxOffset={18}>
            <GlareHover
              width="auto"
              height="auto"
              background="transparent"
              borderRadius="999px"
              borderColor="transparent"
              glareColor="#8ec8ff"
              glareOpacity={0.35}
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
        <span>SCROLL THE JOURNEY</span>
        <span className="streak"><i /></span>
      </div>
    </section>
  )
}

function ChallengeObjective({ reduced }) {
  const rootRef = useRef(null)
  useEffect(() => revealOnScroll(rootRef.current, { reduced }), [reduced])
  return (
    <section className="section challenge-objective" id="objective" ref={rootRef} aria-label="Challenge objective">
      <span className="section-rail" data-reveal>01 · OBJECTIVE</span>
      <span className="section-num" aria-hidden>01</span>
      <p className="kicker" data-reveal style={{ marginBottom: '0.85rem' }}>
        <ScrambleLine text="NASA SPACE APPS 2026 · ABANDONED BUT NOT FORGOTTEN" active />
      </p>
      <h2 className="display" data-reveal style={{ fontSize: 'clamp(2.1rem, 6vw, 4.4rem)', marginBottom: '1.25rem', maxWidth: '16ch' }}>
        They stayed behind<br />
        <span className="outline-text">so we could learn.</span>
      </h2>
      <div className="objective-grid" data-reveal>
        <div className="objective-copy">
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
        {HERO_LEFTOVER?.image && (
          <figure className="objective-figure">
            <div className="nasa-media body-moon" style={{ aspectRatio: '4/5', marginBottom: 0 }}>
              <img
                src={HERO_LEFTOVER.image}
                alt={HERO_LEFTOVER.imageAlt || HERO_LEFTOVER.name}
                loading="lazy"
                decoding="async"
              />
              <span className="credit">{HERO_LEFTOVER.credit} · {HERO_LEFTOVER.coords}</span>
            </div>
            <figcaption className="mono">
              {HERO_LEFTOVER.name} · {HERO_LEFTOVER.coords} · still on the Moon
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}

/** In-flow Atlas title — sticky across Objective→Atlas so the chapter never “tabs” in */
function AtlasBridgeHeading({ atlasActive }) {
  return (
    <header
      className={`atlas-heading atlas-heading--bridge ${atlasActive ? 'is-atlas' : 'is-peek'}`}
      id="atlas-bridge"
      aria-label="Where they still sit"
    >
      <p className="kicker">
        <ScrambleLine text="IMAGE PLACEMENT · RESPECT THE COORDINATES" active={atlasActive} />
      </p>
      <h2 className="display atlas-title">
        Where they<br /><span className="outline-text">still sit</span>
      </h2>
        <p className="atlas-lede">
          Sites are pinned to Mean Earth / Polar Axis coordinates (NSSDC / LROC).
          Hover a hotspot on the Moon for the NASA image and exact location.
        </p>
        {atlasActive && (
          <p className="atlas-drag-cue mono" aria-live="polite">
            <span className="atlas-drag-cue__orb" aria-hidden />
            Drag to rotate · pulsing rings mark far-side sites
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

function Heartbeats({ onOpen, reduced }) {
  const { setLabel } = useCursor()
  return (
    <section className="heartbeats" id="recover" aria-label="Recover hardware">
      <FadeContent blur={!reduced} duration={0.9} threshold={0.15} ease="power2.out">
        <p className="kicker" style={{ marginBottom: '0.75rem' }}>THREE HEARTBEATS · STILL OUT THERE</p>
        <div className="heartbeat-focus">
          <TrueFocus
            sentence="Know them by name"
            borderColor="#8ec8ff"
            glowColor="rgba(142,200,255,0.35)"
            blurAmount={reduced ? 0 : 4}
            animationDuration={0.55}
            pauseBetweenAnimations={1.1}
            manualMode={false}
            focusStyle="brackets"
          />
        </div>
        <p style={{ color: 'var(--ink-dim)', maxWidth: '46ch', marginTop: '0.85rem', lineHeight: 1.55 }}>
          Not scrap — teammates. Let the hardware speak. Open a dossier. Remember their story.
        </p>
        <LightDayCountdown className="light-day--recover" />
        <div className="heartbeat-row" style={{ marginTop: '2rem' }}>
          {HEARTBEATS.map((a) => (
            <SpotlightCard
              key={a.id}
              className="heartbeat-spotlight"
              theme="dark"
              spotlightColor="#8ec8ff"
              intensity={0.22}
              spotlightSize={280}
              softness={0.75}
              grain={0.08}
              style={{ background: 'rgba(7,7,12,0.72)', borderRadius: 0, padding: 0 }}
            >
              <GlareHover
                width="100%"
                height="100%"
                background="transparent"
                borderRadius="0"
                borderColor="transparent"
                glareColor="#ff7a45"
                glareOpacity={0.22}
              >
                <button
                  type="button"
                  className="heartbeat-cell"
                  onClick={() => onOpen(a)}
                  onMouseEnter={() => setLabel('OPEN')}
                  onMouseLeave={() => setLabel('')}
                  style={{ width: '100%', background: 'transparent', border: 'none' }}
                >
                  {a.image && (
                    <div className={`nasa-media heartbeat-media body-${a.body}`}>
                      <img src={a.image} alt={a.imageAlt || a.name} loading="lazy" decoding="async" />
                      <span className="credit">{a.credit} · {a.coords}</span>
                    </div>
                  )}
                  <div className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.14em', color: 'var(--ink-mute)' }}>
                    {a.body.toUpperCase()} · {a.mission} · {a.status}
                  </div>
                  <div className="tx">“{a.transmission}”</div>
                  <p className="heartbeat-voice">
                    {(a.voice || a.science).slice(0, 140)}{(a.voice || a.science).length > 140 ? '…' : ''}
                  </p>
                  <span className="mono" style={{ fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--ice)', marginTop: '0.65rem', display: 'block' }}>
                    HEAR THEIR STORY →
                  </span>
                </button>
              </GlareHover>
            </SpotlightCard>
          ))}
        </div>
      </FadeContent>
    </section>
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
        // Lock early — title is already bridging in from Objective
        const on = !!entry?.isIntersecting && entry.intersectionRatio >= 0.08
        onActiveChange?.(on)
        if (on && !wasOn) {
          onFocusSite?.('a11-lm')
          onCardSite?.('a11-lm')
        }
        if (!on && wasOn) onCardSite?.(null)
        wasOn = on
      },
      // Grow root upward so Atlas begins while Objective is still dissolving
      { threshold: [0, 0.08, 0.2, 0.4, 0.65], rootMargin: '28% 0px 0px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onActiveChange, onCardSite, onFocusSite])

  return (
    <section
      ref={sectionRef}
      className="section location-atlas body-moon"
      id="atlas"
      aria-label="Hardware locations"
    >
      <span className="section-rail">02B · ATLAS</span>
      <span className="section-num" aria-hidden>LOC</span>
      {/* Visible title is AtlasBridgeHeading — sticky from Objective into Atlas */}
    </section>
  )
}

function FleetCard({ item, onOpen }) {
  const { setLabel } = useCursor()
  const bodyColor = item.body === 'mars' ? 'var(--rust)' : item.body === 'deep' ? 'var(--gold)' : 'var(--ice)'

  return (
    <motion.article
      className="fleet-card glass-2 corner-brackets holo-foil"
      style={{ '--chip': bodyColor }}
      whileHover={{ scale: 1.02 }}
      tabIndex={0}
      role="button"
      aria-label={`Open dossier ${item.name}`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } }}
      onMouseEnter={() => setLabel('OPEN FILE')}
      onMouseLeave={() => setLabel('')}
    >
      <div>
        {item.image && (
          <div className={`nasa-media body-${item.body}`} style={{ marginBottom: '0.9rem', aspectRatio: '16/11' }}>
            <img src={item.image} alt={item.imageAlt || item.name} loading="lazy" decoding="async" />
            <span className="credit">{item.credit} · {item.coords}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="data-chip" style={{ '--chip': bodyColor }}>{item.body.toUpperCase()} · {item.mission}</span>
          <span className={`status-dot ${item.status === 'ACTIVE' ? 'live' : item.status === 'COASTING' ? 'coast' : ''}`} title={item.status} />
        </div>
        <h3 className="display" style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>{item.name}</h3>
        <p className="mono" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--ink-mute)' }}>{item.codename}</p>
      </div>
      <div>
        <p className="fleet-voice">
          “{(item.voice || item.science).slice(0, 118)}{(item.voice || item.science).length > 118 ? '…' : ''}”
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {item.tags.map((t) => (
            <span key={t} className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.25rem 0.5rem', border: '1px solid var(--line)', borderRadius: 6 }}>{t}</span>
          ))}
        </div>
      </div>
    </motion.article>
  )
}

function Fleet({ onOpen }) {
  const track = useRef(null)
  const { setLabel } = useCursor()
  const [rail, setRail] = useState(0)

  useEffect(() => {
    const el = track.current
    if (!el) return undefined
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth
      setRail(max > 0 ? el.scrollLeft / max : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="section fleet-section" id="fleet" style={{ paddingRight: 0, paddingLeft: 0 }} aria-label="Silent fleet leftovers">
      <div style={{ padding: '0 clamp(1.25rem, 4vw, 4rem)' }}>
        <span className="section-rail">03 · FLEET</span>
        <span className="section-num" aria-hidden>03</span>
        <p className="kicker"><ScrambleLine text="NASA LEFTOVERS · DRAG TO SURVEY" active /></p>
        <h2 className="display" style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', margin: '0.75rem 0 0.5rem' }}>
          Fifteen voices.<br /><span className="outline-text">One silent fleet.</span>
        </h2>
        <p style={{ color: 'var(--ink-dim)', maxWidth: '48ch', lineHeight: 1.55, marginBottom: '0.5rem' }}>
          Each leftover speaks in the first person — what they were built for, what they found, why they still matter.
          Real NASA photographs. Verified coordinates. Open a dossier and listen.
        </p>
      </div>
      <div
        className="fleet-track"
        ref={track}
        onMouseEnter={() => setLabel('DRAG')}
        onMouseLeave={() => setLabel('')}
        style={{ paddingLeft: 'clamp(1.25rem, 4vw, 4rem)', paddingRight: 'clamp(1.25rem, 4vw, 4rem)' }}
      >
        {ARTIFACTS.map((a) => (
          <FleetCard key={a.id} item={a} onOpen={onOpen} />
        ))}
      </div>
      <div style={{ padding: '0 clamp(1.25rem, 4vw, 4rem)' }}>
        <div className="fleet-rail" aria-hidden>
          <i style={{ left: `calc(${rail * 100}% - 4px)` }} />
        </div>
      </div>
    </section>
  )
}

function Archive({ onOpen }) {
  const [filter, setFilter] = useState('all')
  const { setLabel } = useCursor()
  const filtered = useMemo(() => ARTIFACTS.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'active') return a.status === 'ACTIVE' || a.status === 'COASTING'
    return a.body === filter
  }), [filter])
  const activeIdx = FILTERS.findIndex((f) => f.id === filter)

  return (
    <section className="section" id="archive" aria-label="Archive of discarded equipment">
      <span className="section-rail">04 · ARCHIVE</span>
      <span className="section-num" aria-hidden>04</span>
      <p className="kicker"><ScrambleLine text="FILTERED INDEX · NSSDCA CROSSWALK" active /></p>
      <h2 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: '0.75rem 0 0' }}>
        Browse the <span className="grad-text">discarded</span>
      </h2>
      <div className="archive-filters glass-1" role="tablist" aria-label="Body filter">
        <motion.div
          className="indicator"
          animate={{ x: activeIdx * 88, width: 84 }}
          transition={{ type: 'spring', ...SPRING }}
          style={{ width: 84 }}
        />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{ color: filter === f.id ? 'var(--ink)' : undefined, minWidth: 84 }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <motion.div className="archive-grid" layout>
        <AnimatePresence mode="popLayout">
          {filtered.map((a) => (
            <motion.button
              layout
              key={a.id}
              type="button"
              className="archive-card glass-2 corner-brackets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', ...SPRING_SOFT }}
              onClick={() => onOpen(a)}
              onMouseEnter={() => setLabel('OPEN FILE')}
              onMouseLeave={() => setLabel('')}
              aria-label={`Open ${a.name}`}
              style={{ textAlign: 'left', width: '100%', padding: 0, overflow: 'hidden', gap: 0 }}
            >
              {a.image && (
                <div className={`nasa-media body-${a.body}`} style={{ marginBottom: 0, aspectRatio: '16/9', borderRadius: 0 }}>
                  <img src={a.image} alt={a.imageAlt || a.name} loading="lazy" decoding="async" />
                  <span className="credit">{a.credit} · {a.coords}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1.1rem 0' }}>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--ink-mute)' }}>{a.year} · {a.body.toUpperCase()}</span>
                <span className={`status-dot ${a.status === 'ACTIVE' ? 'live' : a.status === 'COASTING' ? 'coast' : ''}`} />
              </div>
              <h3 className="display" style={{ fontSize: '1.25rem', padding: '0.35rem 1.1rem 0' }}>{a.name}</h3>
              <p style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', lineHeight: 1.5, flex: 1, padding: '0.5rem 1.1rem 1.15rem' }}>{a.story.slice(0, 120)}…</p>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

function ArtifactModal({ item, onClose }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80)
    const t2 = setTimeout(() => setPhase(2), 220)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

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
        className="modal-panel glass-3"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
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
          <div className="nasa-media">
            <img src={item.image} alt={item.imageAlt || item.name} loading="lazy" />
            <span className="credit">{item.credit}</span>
          </div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }}>
          {item.voice && (
            <blockquote className="dossier-voice">
              <p className="mono dossier-voice__label">THE HARDWARE SPEAKS</p>
              <p>“{item.voice}”</p>
            </blockquote>
          )}
          <p style={{ color: 'var(--ink-dim)', lineHeight: 1.65, marginBottom: '1rem' }}>{item.story}</p>
          <p style={{ color: 'var(--ice)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', letterSpacing: '0.04em', marginBottom: '1rem' }}>
            “{item.transmission}”
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
      <div className="footer-mark holo-foil">SILENT FLEET</div>
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
            <ScrambleLine text="THEY ARE STILL OUT THERE. SOME STILL SPEAK." active={inView} />
            <span className="status-dot live" style={{ marginLeft: 10, verticalAlign: 'middle' }} />
          </p>
          <LightDayCountdown compact className="light-day--footer" />
          <p style={{ color: 'var(--ink-mute)', fontSize: '0.75rem', marginTop: 12, maxWidth: 520, lineHeight: 1.5 }}>
            Built for NASA Space Apps 2026 — “Abandoned but not Forgotten.”
            Facts cross-checked against NSSDCA, LROC, ALSJ, HiRISE & PDS.
            Procedural visuals · AI-assisted code disclosed per challenge guidelines.
          </p>
        </div>
        <MagneticButton href="#top">RETURN TO SURFACE</MagneticButton>
      </div>
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
  const scoreUnlockedRef = useRef(false)
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
    style.textContent = GLOBAL_CSS
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
  }, [mobile])

  // Score unlocks on first intentional gesture — mute is escape, not the designed path
  useEffect(() => {
    if (booting) return undefined
    const unlock = async () => {
      if (scoreUnlockedRef.current) return
      scoreUnlockedRef.current = true
      const s = soundRef.current
      if (!s) return
      await s.unlock()
      if (!s.isEnabled?.()) {
        const on = s.toggle()
        setAudioOn(!!on)
      }
    }
    const opts = { once: true, passive: true }
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('keydown', unlock, opts)
    window.addEventListener('wheel', unlock, opts)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('wheel', unlock)
    }
  }, [booting])

  const onFilmSample = useCallback((sample) => {
    soundRef.current?.setFilm(sample)
    if (sample?.label) setActLabel((prev) => (prev === sample.label ? prev : sample.label))
    const kill = sample?.chromeKill ?? 0
    setChromeKill((prev) => (Math.abs(prev - kill) < 0.02 ? prev : kill))
    // Mars HUD only while film focus is Meridiani/storm — impossible on Recover (film tip ≥ 1)
    const marsOn = !atlasLock && (sample?.focus === 'mars' || sample?.focus === 'storm')
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

  /** Recover / Fleet — soft continuum coda (not a hard brochure jump mid-film). */
  const onNavCoda = useCallback((e, which = 'recover') => {
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
      scrollToHash(which === 'fleet' ? '#fleet' : '#recover', { duration: 1.15, offset: -72 })
    })
    history.replaceState(null, '', which === 'fleet' ? '#fleet' : '#recover')
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
    soundRef.current?.ping(item?.body === 'mars' ? 480 : item?.body === 'deep' ? 720 : 560)
  }, [])

  const toggleAudio = useCallback(async () => {
    const s = soundRef.current
    if (!s) return
    await s.unlock()
    const on = s.toggle()
    setAudioOn(on)
  }, [])

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
        <div className="sf-app" ref={mainRef}>
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
              mobile={mobile}
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
              aria-label={audioOn ? 'Mute soundscape' : 'Enable soundscape'}
            >
              {audioOn ? actLabel : 'SOUND'}
            </button>
          </div>

          {!booting && import.meta.env.DEV && (
            <FilmScrubber />
          )}

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

                  <AtlasBridgeHeading atlasActive={atlasLock} />

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

              <div className="story-seam story-seam--into-recover" aria-hidden />

              <ErrorBoundary>
                <Heartbeats onOpen={openDossier} reduced={reduced} />
              </ErrorBoundary>

              <ErrorBoundary>
                <Fleet onOpen={openDossier} />
              </ErrorBoundary>
            </div>

            <ErrorBoundary>
              <Archive onOpen={openDossier} />
            </ErrorBoundary>

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

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
  motion, AnimatePresence, useScroll, useSpring, useMotionValue,
  useInView,
} from 'framer-motion'
import { createSoundscape } from './audio/Soundscape'
import { ARTIFACTS, NASA_RESOURCES } from './data/artifacts'
import { preloadContinuumModule, preloadCriticalMoon, preloadPlanetTextures } from './world/preloadTextures'
import { GLOBAL_CSS } from './styles/global.css.js'
import {
  createScrollEngine, destroyScrollEngine, playHeroIntro, playBootSequence,
  revealOnScroll,
} from './motion/engine'
import { ranged, getSessionSeed } from './motion/seed'
import {
  Magnet, SpotlightCard, ClickSpark, FadeContent,
  GradientText, GlareHover, BlurText, TrueFocus,
} from './bits'
import './bits/SpotlightCard/SpotlightCard.css'
import './bits/GradientText/GradientText.css'
import './bits/GlareHover/GlareHover.css'
import './bits/TrueFocus/TrueFocus.css'

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
const MOON_SITES = ARTIFACTS.filter((a) => a.body === 'moon')
const MARS_SITES = ARTIFACTS.filter((a) => a.body === 'mars')

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

function Nav({ progress }) {
  const scaleX = useSpring(progress, { stiffness: 90, damping: 24 })
  return (
    <nav className="nav" aria-label="Primary">
      <a href="#top" className="nav-brand" aria-label="Silent Fleet home">SILENT FLEET</a>
      <div className="nav-links">
        <a href="#objective">OBJECTIVE</a>
        <a href="#atlas">ATLAS</a>
        <a href="#journey">JOURNEY</a>
        <a href="#recover">RECOVER</a>
        <a href="#fleet">FLEET</a>
      </div>
      <motion.div className="nav-progress" style={{ scaleX, width: '100%' }} />
    </nav>
  )
}

function FilmJourney() {
  return (
    <section id="journey" className="journey-spacer" aria-label="Film continuum journey">
      <span className="section-rail" style={{ position: 'sticky', top: '30vh' }}>FILM · CONTINUUM</span>
    </section>
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
        <div data-hero-body style={{ marginBottom: '1.5rem', maxWidth: '38ch' }}>
          <p className="hero-body-blur" style={{ color: 'var(--ink-dim)', fontSize: 'clamp(1.05rem, 2.4vw, 1.3rem)', lineHeight: 1.5, margin: 0 }}>
            Hardware NASA left behind across the Moon, Mars, and deep space — and the science that still belongs to it.
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
      <h2 className="display" data-reveal style={{ fontSize: 'clamp(2.1rem, 6vw, 4.4rem)', marginBottom: '1.25rem', maxWidth: '14ch' }}>
        They stayed behind<br />
        <span className="outline-text">so we could learn.</span>
      </h2>
      <div className="objective-grid" data-reveal>
        <div className="objective-copy">
          <LineReveal>
            <span style={{ color: 'var(--ink-dim)', fontSize: '1.12rem', lineHeight: 1.7, display: 'block' }}>
              Since the 1960s, NASA has left hardware across the solar system — landers, rovers,
              experiment packages, and probes that finished their missions or simply kept going.
              The NASA Catalogue of Manmade Material on the Moon alone lists hundreds of items still sitting in the dust.
            </span>
          </LineReveal>
          <LineReveal delay={0.08}>
            <span style={{ color: 'var(--ink-dim)', fontSize: '1.12rem', lineHeight: 1.7, display: 'block', marginTop: '1.1rem' }}>
              This challenge asks storytellers to build a personal connection to those forgotten explorers —
              and to leave inspired by the science they conducted. Accuracy matters: every coordinate
              ties to NSSDCA, LROC, ALSJ, HiRISE, or PDS.
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
          Not scrap — teammates. Open a dossier. See the NASA image. Hear their last words.
        </p>
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
                  <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    {a.science.slice(0, 110)}…
                  </div>
                  <span className="mono" style={{ fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--ice)', marginTop: '0.65rem', display: 'block' }}>
                    OPEN NASA DOSSIER →
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

function LocationAtlas({ onOpen, onActiveChange, onFocusSite, onCardSite, cardSiteId }) {
  const { setLabel } = useCursor()
  const sectionRef = useRef(null)
  const [body, setBody] = useState('moon')
  const [hover, setHover] = useState(null)
  const sites = body === 'moon' ? MOON_SITES : MARS_SITES

  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = !!entry?.isIntersecting && entry.intersectionRatio > 0.28
        onActiveChange?.(on)
      },
      { threshold: [0.28, 0.45, 0.6], rootMargin: '-8% 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onActiveChange])

  useEffect(() => {
    onFocusSite?.(hover?.id || cardSiteId || (body === 'moon' ? 'a11-lm' : 'opportunity'))
  }, [hover, cardSiteId, body, onFocusSite])

  return (
    <section
      ref={sectionRef}
      className={`section location-atlas body-${body}`}
      id="atlas"
      aria-label="Hardware locations"
    >
      <span className="section-rail">02B · ATLAS</span>
      <span className="section-num" aria-hidden>LOC</span>
      <p className="kicker"><ScrambleLine text="IMAGE PLACEMENT · RESPECT THE COORDINATES" active /></p>
      <h2 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', margin: '0.75rem 0 0.85rem' }}>
        Where they<br /><span className="outline-text">still sit</span>
      </h2>
      <p style={{ color: 'var(--ink-dim)', maxWidth: '48ch', lineHeight: 1.55, marginBottom: '1.5rem' }}>
        Every NASA photograph is anchored to Mean Earth / Polar Axis (Moon) or planetocentric east longitude (Mars).
        Hover a hotspot on the Moon — or pick a site from the list — for the NASA image and coordinates.
      </p>

      <div className="atlas-tabs" role="tablist" aria-label="Body">
        {['moon', 'mars'].map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={body === id}
            className={body === id ? 'on' : ''}
            onClick={() => { setBody(id); setHover(null) }}
          >
            {id.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={`atlas-stage body-${body}`}>
        <div className="atlas-panel">
          <ul className="atlas-site-list" aria-label={`${body} sites`}>
            {sites.map((site) => {
              const active = hover?.id === site.id || cardSiteId === site.id
              return (
                <li key={site.id}>
                  <button
                    type="button"
                    className={`atlas-site ${site.status === 'ACTIVE' ? 'live' : ''} ${active ? 'active' : ''}`}
                    aria-label={`${site.name} at ${site.coords}`}
                    onMouseEnter={() => {
                      setHover(site)
                      setLabel('SITE')
                      onCardSite?.(site.id)
                    }}
                    onMouseLeave={() => {
                      setHover((h) => (h?.id === site.id ? null : h))
                      setLabel('')
                      onCardSite?.(null)
                    }}
                    onFocus={() => {
                      setHover(site)
                      setLabel('SITE')
                      onCardSite?.(site.id)
                    }}
                    onClick={() => onOpen(site)}
                  >
                    <span className="atlas-site-dot" aria-hidden />
                    <span className="atlas-site-copy">
                      <span className="atlas-site-name">{site.name}</span>
                      <span className="mono atlas-site-meta">{site.coords}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="atlas-telemetry glass-2">
            <p style={{ color: 'var(--ink-dim)', lineHeight: 1.6 }}>
              The Continuum Moon holds position here. Hover a glowing site on its surface for the NASA plate —
              Eagle on Tranquility, Opportunity on Meridiani — not a shuffled card.
            </p>
          </div>
        </div>
      </div>
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
        <p style={{ color: 'var(--ink-dim)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1rem' }}>{item.science.slice(0, 110)}…</p>
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
          Fifteen files.<br /><span className="outline-text">One silent fleet.</span>
        </h2>
        <p style={{ color: 'var(--ink-dim)', maxWidth: '48ch', lineHeight: 1.55, marginBottom: '0.5rem' }}>
          Real NASA photographs of hardware left on the Moon, Mars, and beyond. Each card opens a verified dossier.
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
          <p style={{ color: 'var(--ink-dim)', lineHeight: 1.65, marginBottom: '1rem' }}>{item.story}</p>
          <p style={{ color: 'var(--ice)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', letterSpacing: '0.04em', marginBottom: '1rem' }}>
            “{item.transmission}”
          </p>
          <p style={{ color: 'var(--ink-mute)', fontSize: '0.9rem', lineHeight: 1.55 }}>{item.science}</p>
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
            <ScrambleLine text="THEY ARE STILL OUT THERE." active={inView} />
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
  const [focusSiteId, setFocusSiteId] = useState('a11-lm')
  const [cardSiteId, setCardSiteId] = useState(null)
  const mainRef = useRef(null)
  const soundRef = useRef(null)
  const moonReadyResolve = useRef(null)
  const moonReadyPromise = useMemo(
    () => new Promise((resolve) => { moonReadyResolve.current = resolve }),
    [],
  )
  const mouse = useMouse()
  const mobile = useMediaQuery('(max-width: 768px)')
  const reduced = usePrefersReduced()
  const { scrollYProgress } = useScroll()
  // One continuous scroll curve — never remap mid-flight (that caused the moon glitch)
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 70, damping: 28, mass: 0.95 })

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

  const onFilmSample = useCallback((sample) => {
    soundRef.current?.setFilm(sample)
    if (sample?.label) setActLabel((prev) => (prev === sample.label ? prev : sample.label))
  }, [])

  const onMoonReady = useCallback(() => {
    moonReadyResolve.current?.()
  }, [])

  const onAtlasActive = useCallback((on) => {
    setAtlasLock(on)
    if (!on) setCardSiteId(null)
  }, [])

  const onFocusSite = useCallback((id) => {
    if (id) setFocusSiteId(id)
  }, [])

  const onHotspotHover = useCallback((site) => {
    setCardSiteId(site.id)
    setFocusSiteId(site.id)
  }, [])

  const onHotspotLeave = useCallback((site) => {
    setCardSiteId((id) => (id === site.id ? null : id))
  }, [])

  useEffect(() => {
    if (booting) return undefined
    createScrollEngine()
    // Warm session seed so reload variance is live
    getSessionSeed()
    return () => destroyScrollEngine()
  }, [booting])

  const onBootDone = useCallback(() => {
    setBooting(false)
    requestAnimationFrame(() => setReady(true))
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
                progress={smoothProgress}
                mouse={mouse}
                mobile={mobile}
                reduced={reduced}
                active={!booting}
                onSample={onFilmSample}
                onMoonReady={onMoonReady}
                atlasLock={atlasLock}
                focusSiteId={focusSiteId}
                hotspotsInteractive={atlasLock && !mobile}
                cardSiteId={cardSiteId}
                onHotspotHover={onHotspotHover}
                onHotspotLeave={onHotspotLeave}
                onHotspotOpen={openDossier}
              />
            </Suspense>
          </ErrorBoundary>
          <div className="sf-veil" aria-hidden />

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

          <Nav progress={smoothProgress} />

          <button
            type="button"
            className={`audio-toggle ${audioOn ? 'on' : ''}`}
            onClick={toggleAudio}
            aria-pressed={audioOn}
            aria-label={audioOn ? 'Mute soundscape' : 'Enable soundscape'}
          >
            {audioOn ? actLabel : 'SOUND'}
          </button>

          <div className="sf-chapters">
            <ErrorBoundary fallback={<section className="hero"><div className="hero-content"><h1 className="display display-xl">SILENT FLEET</h1></div></section>}>
              <Hero ready={ready && !booting} reduced={reduced} onOpen={openDossier} />
            </ErrorBoundary>

            <ErrorBoundary>
              <ChallengeObjective reduced={reduced} />
            </ErrorBoundary>

            <ErrorBoundary>
              <LocationAtlas
                onOpen={openDossier}
                onActiveChange={onAtlasActive}
                onFocusSite={onFocusSite}
                onCardSite={setCardSiteId}
                cardSiteId={cardSiteId}
              />
            </ErrorBoundary>

            <FilmJourney />

            <ErrorBoundary>
              <Heartbeats onOpen={openDossier} reduced={reduced} />
            </ErrorBoundary>

            <ErrorBoundary>
              <Fleet onOpen={openDossier} />
            </ErrorBoundary>

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

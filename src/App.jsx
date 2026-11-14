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
import { activeCaption } from './world/film'
import { ARTIFACTS, NASA_RESOURCES } from './data/artifacts'
import { GLOBAL_CSS } from './styles/global.css.js'
import {
  createScrollEngine, destroyScrollEngine, playHeroIntro, playBootSequence,
  revealOnScroll,
} from './motion/engine'
import { ranged, getSessionSeed } from './motion/seed'

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
const HEARTBEATS = ['opportunity', 'a11-lm', 'voyager1']
  .map((id) => ARTIFACTS.find((a) => a.id === id))
  .filter(Boolean)

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789░▒▓█/<>=+#*'

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

function Preloader({ onDone, reduced }) {
  const rootRef = useRef(null)
  useEffect(() => {
    const dur = ranged(1.7, 2.4, 3)
    return playBootSequence(rootRef.current, { onDone, reduced, duration: dur })
  }, [onDone, reduced])
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
          HARDWARE STILL OUT THERE
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
        <a href="#journey">JOURNEY</a>
        <a href="#recover">RECOVER</a>
      </div>
      <motion.div className="nav-progress" style={{ scaleX, width: '100%' }} />
    </nav>
  )
}

function WorldCaption({ progress, onOpen }) {
  const [cap, setCap] = useState(null)
  useEffect(() => {
    const unsub = progress.on('change', (v) => {
      const next = activeCaption(v)
      setCap((prev) => (prev?.at === next?.at ? prev : next))
    })
    setCap(activeCaption(progress.get()))
    return () => unsub()
  }, [progress])

  const dossier = cap?.dossier ? ARTIFACTS.find((a) => a.id === cap.dossier) : null

  return (
    <AnimatePresence mode="wait">
      {cap && (
        <motion.div
          key={cap.at}
          className="world-caption"
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <p className="kicker">{cap.kicker}</p>
          <h2>{cap.title}</h2>
          <p>{cap.body}</p>
          {dossier && (
            <button
              type="button"
              className="dossier-link"
              onClick={() => onOpen(dossier)}
            >
              RECOVER DOSSIER · {dossier.name.toUpperCase()}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FilmJourney() {
  return (
    <section id="journey" className="journey-spacer" aria-label="Film continuum journey">
      <span className="section-rail" style={{ position: 'sticky', top: '30vh' }}>FILM · CONTINUUM</span>
    </section>
  )
}

function Hero({ ready, reduced }) {
  const { setLabel } = useCursor()
  const rootRef = useRef(null)
  useEffect(() => {
    if (!ready) return undefined
    const delay = ranged(0.05, 0.22, 7)
    return playHeroIntro(rootRef.current, { reduced, seedDelay: delay })
  }, [ready, reduced])

  return (
    <section className="hero" id="top" aria-label="Hero" ref={rootRef}>
      <div className="hero-content">
        <p className="kicker" data-hero-kicker style={{ marginBottom: '1.5rem', opacity: ready ? undefined : 1 }}>
          NASA SPACE APPS 2026 · ABANDONED BUT NOT FORGOTTEN
        </p>
        <h1 className="display display-xl" style={{ marginBottom: '1.35rem' }} aria-label="Silent Fleet">
          <span className="hero-line" data-hero-line>SILENT</span>
          <span className="hero-line grad-text" data-hero-line>FLEET</span>
        </h1>
        {/* Accessible unsplit twin for assistive tech when lines animate */}
        <span className="sr-only">Silent Fleet</span>
        <p
          data-hero-body
          style={{ maxWidth: '34ch', color: 'var(--ink-dim)', fontSize: 'clamp(1.05rem, 2.4vw, 1.3rem)', lineHeight: 1.5, marginBottom: '2.25rem', opacity: ready ? undefined : 1 }}
        >
          Hardware NASA left behind — and the science that still belongs to it.
        </p>
        <div data-hero-cta style={{ opacity: ready ? undefined : 1 }}>
          <MagneticButton
            href="#journey"
            onMouseEnter={() => setLabel('ENTER')}
            onMouseLeave={() => setLabel('')}
          >
            ENTER THE CONTINUUM
          </MagneticButton>
        </div>
      </div>
      <div className="hero-scroll-cue" data-hero-cue aria-hidden style={{ opacity: ready ? undefined : 0.7 }}>
        <span>SCROLL THE JOURNEY</span>
        <span className="streak"><i /></span>
      </div>
    </section>
  )
}

function Heartbeats({ onOpen, reduced }) {
  const { setLabel } = useCursor()
  const rootRef = useRef(null)
  useEffect(() => revealOnScroll(rootRef.current, { reduced }), [reduced])
  return (
    <section className="heartbeats" id="recover" aria-label="Recover hardware" ref={rootRef}>
      <p className="kicker" data-reveal style={{ marginBottom: '0.75rem' }}>THREE HEARTBEATS · STILL OUT THERE</p>
      <h2 className="display" data-reveal style={{ marginBottom: '0.5rem' }}>
        Recover them<br />by name
      </h2>
      <div className="heartbeat-row" data-reveal>
        {HEARTBEATS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="heartbeat-cell"
            onClick={() => onOpen(a)}
            onMouseEnter={() => setLabel('OPEN')}
            onMouseLeave={() => setLabel('')}
          >
            <div className="mono" style={{ fontSize: '0.58rem', letterSpacing: '0.14em', color: 'var(--ink-mute)' }}>
              {a.mission} · {a.status}
            </div>
            <div className="tx">“{a.transmission}”</div>
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', lineHeight: 1.45 }}>
              {a.science.slice(0, 110)}…
            </div>
          </button>
        ))}
      </div>
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
  const mainRef = useRef(null)
  const soundRef = useRef(null)
  const mouse = useMouse()
  const mobile = useMediaQuery('(max-width: 768px)')
  const reduced = usePrefersReduced()
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.85 })

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

  const onFilmSample = useCallback((sample) => {
    soundRef.current?.setFilm(sample)
    if (sample?.label) setActLabel((prev) => (prev === sample.label ? prev : sample.label))
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
      <div className="sf-app" ref={mainRef}>
        <ErrorBoundary fallback={<div className="canvas-fallback" style={{ position: 'fixed', inset: 0 }} />}>
          {!booting && (
            <Suspense fallback={<div className="canvas-fallback" style={{ position: 'fixed', inset: 0 }} />}>
              <ContinuumCanvas
                progress={smoothProgress}
                mouse={mouse}
                mobile={mobile}
                reduced={reduced}
                active={!booting}
                onSample={onFilmSample}
              />
            </Suspense>
          )}
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

        {booting && <Preloader onDone={onBootDone} reduced={reduced} />}

        <Nav progress={smoothProgress} />
        {!booting && <WorldCaption progress={smoothProgress} onOpen={openDossier} />}

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
            <Hero ready={ready && !booting} reduced={reduced} />
          </ErrorBoundary>

          <FilmJourney />

          <ErrorBoundary>
            <Heartbeats onOpen={openDossier} reduced={reduced} />
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
    </CursorProvider>
  )
}

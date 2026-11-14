/**
 * Silent Fleet shelf — Vasari VHS mechanics, dossier covers.
 * Spine-out endless row; active leftover pulled out + rotateY to full-bleed cover.
 * One rAF loop + WAAPI caption masks. No opacity fades.
 */
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { ARTIFACTS } from '../data/artifacts'

const EASE = 'cubic-bezier(.2,.8,.2,1)'
const FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'moon', label: 'MOON' },
  { id: 'mars', label: 'MARS' },
  { id: 'deep', label: 'DEEP' },
]

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

function B(r) {
  if (Math.abs(r) < 1) return (r + Math.sin(Math.PI * r) / Math.PI) / 2
  return r > 0 ? 0.5 : -0.5
}

function F(r, ws, d, gap) {
  return r * (ws + gap) + (d - ws + 1.6 * gap) * B(r)
}

function slideCaption(maskEl, text, dir) {
  if (!maskEl) return
  const next = document.createElement('span')
  next.textContent = text
  next.style.transform = `translateY(${dir * 105}%)`
  maskEl.querySelectorAll('span').forEach((old) => {
    if (old.dataset.leaving) return
    old.dataset.leaving = '1'
    old.style.position = 'absolute'
    old.style.inset = '0'
    old.animate(
      [
        { transform: old.style.transform || 'translateY(0)' },
        { transform: `translateY(${-dir * 105}%)` },
      ],
      { duration: 650, easing: EASE, fill: 'forwards' },
    ).finished.then(() => old.remove()).catch(() => old.remove())
  })
  maskEl.appendChild(next)
  next.animate(
    [{ transform: `translateY(${dir * 105}%)` }, { transform: 'translateY(0)' }],
    { duration: 650, easing: EASE, fill: 'both' },
  )
}

export default function FleetShelf({ onSelect }) {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const probeRef = useRef(null)
  const tabBarRef = useRef(null)
  const indicatorRef = useRef(null)
  const playRef = useRef(null)
  const titleMask = useRef(null)
  const subMask = useRef(null)
  const yearMask = useRef(null)

  const films = ARTIFACTS
  const n = films.length
  const copies = 3
  const total = n * copies

  const state = useRef({
    s: n + Math.min(9, n - 1), // opportunity-ish center (mars leftover)
    T: n + Math.min(9, n - 1),
    hover: -1,
    active: Math.min(9, n - 1),
    mx: 0,
    my: 0,
    tiltX: 0,
    tiltY: 0,
    onCover: false,
    drag: null,
    wheelTimer: 0,
    reduced: false,
    dims: { H: 320, ws: 54, d: 240, gap: 10, W: 1200 },
  })

  const [filter, setFilter] = useState('all')
  const [activeId, setActiveId] = useState(films[Math.min(9, n - 1)]?.id)

  const measure = useCallback(() => {
    const probe = probeRef.current
    const root = rootRef.current
    if (!probe || !root) return
    const H = probe.getBoundingClientRect().height
    const ws = H * 142 / 840
    const d = H * 0.72 // ~3:4 cover face width vs height (dossier card)
    const gap = H * 0.03
    const W = root.getBoundingClientRect().width
    state.current.dims = { H, ws, d, gap, W }
    if (stageRef.current) {
      stageRef.current.style.setProperty('--ws', `${ws}px`)
      stageRef.current.style.setProperty('--d', `${d}px`)
      stageRef.current.style.setProperty('--H', `${H}px`)
    }
  }, [])

  const setActive = useCallback((idx, dir = 1) => {
    const i = ((idx % n) + n) % n
    const film = films[i]
    if (!film) return
    const prev = state.current.active
    state.current.active = i
    setActiveId(film.id)
    if (prev === i) return
    slideCaption(titleMask.current, film.name, dir)
    slideCaption(subMask.current, `${film.codename} · ${film.mission}`, dir)
    slideCaption(yearMask.current, `${film.year} · ${film.body.toUpperCase()}`, dir)
  }, [films, n])

  // Decade / body filter jump
  const jumpFilter = useCallback((id) => {
    setFilter(id)
    if (id === 'all') {
      state.current.T = Math.round(state.current.T / n) * n + 0
      return
    }
    const first = films.findIndex((a) => a.body === id)
    if (first < 0) return
    const base = Math.round(state.current.T / n) * n
    let best = base + first
    const cur = state.current.T
    ;[-n, 0, n].forEach((k) => {
      const cand = base + first + k
      if (Math.abs(cand - cur) < Math.abs(best - cur)) best = cand
    })
    state.current.T = best
  }, [films, n])

  useEffect(() => {
    measure()
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    state.current.reduced = mq.matches
    const onMq = () => { state.current.reduced = mq.matches }
    mq.addEventListener?.('change', onMq)

    // Seed captions
    const film = films[state.current.active]
    if (film) {
      if (titleMask.current) {
        titleMask.current.innerHTML = ''
        const s = document.createElement('span')
        s.textContent = film.name
        titleMask.current.appendChild(s)
      }
      if (subMask.current) {
        subMask.current.innerHTML = ''
        const s = document.createElement('span')
        s.textContent = `${film.codename} · ${film.mission}`
        subMask.current.appendChild(s)
      }
      if (yearMask.current) {
        yearMask.current.innerHTML = ''
        const s = document.createElement('span')
        s.textContent = `${film.year} · ${film.body.toUpperCase()}`
        yearMask.current.appendChild(s)
      }
    }

    let raf = 0
    let last = performance.now()
    const lifts = new Float32Array(total)

    const tick = (now) => {
      const st = state.current
      let dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { H, ws, d, gap, W } = st.dims
      const k = st.drag ? 18 : (st.reduced ? 40 : 5.2)
      const alpha = st.reduced ? 1 : (1 - Math.exp(-k * dt))
      st.s += (st.T - st.s) * alpha
      if (Math.abs(st.T - st.s) < 1e-4) st.s = st.T

      // Normalize loop
      const loop = n
      if (st.s > loop * 2.5) { st.s -= loop; st.T -= loop }
      if (st.s < loop * 0.5) { st.s += loop; st.T += loop }

      const active = ((Math.round(st.s) % n) + n) % n
      if (active !== st.active) {
        const dir = Math.sign(st.T - st.s) || 1
        setActive(active, dir)
      }

      // Tab indicator — highlight active film's body (Vasari decade behaviour)
      const bar = tabBarRef.current
      const ind = indicatorRef.current
      if (bar && ind) {
        const body = films[st.active]?.body || 'all'
        const btn = bar.querySelector(`[data-filter="${body}"]`)
          || bar.querySelector('[data-filter="all"]')
        if (btn) {
          ind.style.width = `${btn.offsetWidth}px`
          ind.style.transform = `translateX(${btn.offsetLeft}px)`
          bar.querySelectorAll('.fleet-shelf__tab').forEach((b) => {
            b.classList.toggle('is-on', b === btn)
          })
        }
      }

      // Tilt
      const settled = Math.abs(st.T - st.s) < 0.3
      const coverHot = settled
        && Math.abs(st.mx - W / 2) < 0.55 * d
        && Math.abs(st.my - (rootRef.current?.getBoundingClientRect().top + rootRef.current?.getBoundingClientRect().height / 2 || 0)) < 0.55 * H
      st.onCover = coverHot
      const tTilt = st.reduced ? 1 : (1 - Math.exp(-7 * dt))
      if (coverHot) {
        st.tiltY += (((st.mx - W / 2) / (0.55 * d)) * 9 - st.tiltY) * tTilt
        // approximate shelf center Y from stage
        const cy = rootRef.current
          ? rootRef.current.getBoundingClientRect().top + rootRef.current.getBoundingClientRect().height * 0.48
          : 0
        st.tiltX += ((-(st.my - cy) / (H / 2)) * 6 - st.tiltX) * tTilt
      } else {
        st.tiltY += (((st.mx - W / 2) / W) * 5 - st.tiltY) * tTilt
        st.tiltX += (0 - st.tiltX) * tTilt
      }

      const tapes = stageRef.current?.querySelectorAll('.fleet-tape')
      if (tapes) {
        tapes.forEach((el, v) => {
          let r = v - st.s
          while (r > total / 2) r -= total
          while (r < -total / 2) r += total
          const x = F(r, ws, d, gap)
          if (Math.abs(x) > W / 2 + 1.5 * d) {
            el.style.visibility = 'hidden'
            return
          }
          el.style.visibility = 'visible'
          const o = smoothstep(Math.max(0, 1 - Math.abs(r)))
          const hoverLift = st.hover === v && Math.abs(r) > 0.5 ? 1 : 0
          const liftA = st.reduced ? 1 : (1 - Math.exp(-12 * dt))
          lifts[v] += (hoverLift - lifts[v]) * liftA
          const y = -o * 0.025 * H - lifts[v] * 0.045 * H
          const z = o * 0.2 * H
          const rotY = -90 * o + st.tiltY * o
          const rotX = st.tiltX * o
          const rotZ = -4.5 * o
          el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rotZ}deg) rotateX(${rotX}deg) rotateY(${rotY}deg)`
          el.style.zIndex = String(Math.round(100 - Math.abs(r) * 4))
          el.style.setProperty('--shade-sp', String(o * 0.55))
          el.style.setProperty('--shade-cv', String((1 - o) * 0.45))
          el.dataset.open = o > 0.55 ? '1' : '0'
        })
      }

      // Play ring scale
      if (playRef.current) {
        const sc = smoothstep(Math.max(0, 1 - Math.abs(st.T - st.s) * 3))
        playRef.current.style.transform = `translate(-50%, -50%) scale(${sc})`
        const left = W / 2 - 0.5 * d - 6
        playRef.current.style.left = `${left}px`
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      mq.removeEventListener?.('change', onMq)
    }
  }, [films, measure, n, setActive, total, filter])

  const onPointerMove = (e) => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    state.current.mx = e.clientX - rect.left
    state.current.my = e.clientY
    const drag = state.current.drag
    if (drag) {
      const dx = e.clientX - drag.x0
      if (!drag.active && Math.abs(dx) > 5) drag.active = true
      if (drag.active) {
        const { ws, gap } = state.current.dims
        state.current.T = drag.T0 - dx / (ws + gap)
      }
    }
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    state.current.drag = {
      x0: e.clientX,
      T0: state.current.T,
      active: false,
    }
  }

  const onPointerUp = (e) => {
    const drag = state.current.drag
    state.current.drag = null
    if (drag?.active) {
      state.current.T = Math.round(state.current.T)
      e.preventDefault()
    }
  }

  const onWheel = (e) => {
    // Prefer page scroll — only scrub the shelf on horizontal / Shift+wheel
    const absX = Math.abs(e.deltaX)
    const absY = Math.abs(e.deltaY)
    if (!e.shiftKey && absY >= absX) return
    e.preventDefault()
    const { ws, gap } = state.current.dims
    const delta = absX > absY ? e.deltaX : e.deltaY
    state.current.T += delta / (ws + gap) * 0.5
    window.clearTimeout(state.current.wheelTimer)
    state.current.wheelTimer = window.setTimeout(() => {
      state.current.T = Math.round(state.current.T)
    }, 160)
  }

  const go = (delta) => {
    state.current.T = Math.round(state.current.T) + delta
  }

  const openActive = () => {
    const film = films[state.current.active]
    if (film) onSelect?.(film)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      if (e.key === 'Enter') openActive()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const tapes = useMemo(() => {
    const list = []
    for (let c = 0; c < copies; c++) {
      for (let i = 0; i < n; i++) {
        list.push({ v: c * n + i, film: films[i] })
      }
    }
    return list
  }, [copies, films, n])

  return (
    <div
      ref={rootRef}
      className="fleet-shelf"
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    >
      <div ref={probeRef} className="fleet-shelf__probe" aria-hidden />

      <nav className="fleet-shelf__tabs" ref={tabBarRef} aria-label="Fleet bodies">
        <i className="fleet-shelf__tab-ind" ref={indicatorRef} aria-hidden />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            data-filter={f.id}
            className={`fleet-shelf__tab${filter === f.id ? ' is-on' : ''}`}
            onClick={() => jumpFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <section
        className="fleet-shelf__stage-wrap"
        aria-label="Leftover hardware shelf"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="fleet-shelf__stage" ref={stageRef}>
          {tapes.map(({ v, film }) => (
            <div
              key={v}
              className="fleet-tape"
              data-v={v}
              onPointerEnter={() => { state.current.hover = v }}
              onPointerLeave={() => { if (state.current.hover === v) state.current.hover = -1 }}
              onClick={(e) => {
                if (state.current.drag?.active) return
                let r = v - state.current.s
                while (r > total / 2) r -= total
                while (r < -total / 2) r += total
                if (Math.abs(r) < 0.5) {
                  openActive()
                } else {
                  state.current.T = Math.round(state.current.T + r)
                }
              }}
            >
              <div className="fleet-tape__sp">
                <div
                  className="fleet-tape__sp-art"
                  style={{ backgroundImage: film.image ? `url(${film.image})` : undefined }}
                />
                <span className="fleet-tape__sp-title">{film.name}</span>
                <span className="fleet-tape__sp-brand">FLEET</span>
                <span className="fleet-tape__sp-badge">NASA</span>
                <i className="fleet-tape__shade" aria-hidden />
              </div>
              <div className="fleet-tape__cv">
                <div
                  className="fleet-tape__cv-photo"
                  style={{ backgroundImage: film.image ? `url(${film.image})` : undefined }}
                >
                  <span className="fleet-tape__cv-credit">
                    {film.credit} · {film.coords}
                  </span>
                </div>
                <div className="fleet-tape__cv-body">
                  <div className="fleet-tape__cv-row">
                    <span>{film.year} · {film.body.toUpperCase()}</span>
                    <i className={`status-dot ${film.status === 'ACTIVE' ? 'live' : film.status === 'COASTING' ? 'coast' : ''}`} />
                  </div>
                  <h3>{film.name}</h3>
                  <p>{(film.voice || film.story || '').slice(0, 110)}…</p>
                </div>
                <i className="fleet-tape__shade fleet-tape__shade--cv" aria-hidden />
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        ref={playRef}
        type="button"
        className="fleet-shelf__play"
        aria-label="Open dossier"
        onClick={openActive}
      />

      <div className="fleet-shelf__caption" aria-live="polite">
        <div className="fleet-shelf__mask fleet-shelf__mask--title" ref={titleMask} />
        <div className="fleet-shelf__mask fleet-shelf__mask--sub" ref={subMask} />
        <div className="fleet-shelf__mask fleet-shelf__mask--year" ref={yearMask} />
      </div>

      <button type="button" className="fleet-shelf__arrow fleet-shelf__arrow--l" aria-label="Previous leftover" onClick={() => go(-1)}>
        <svg viewBox="0 0 18 10" aria-hidden><path d="M5 1 L1 5 L5 9 M1 5 H17" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button type="button" className="fleet-shelf__arrow fleet-shelf__arrow--r" aria-label="Next leftover" onClick={() => go(1)}>
        <svg viewBox="0 0 18 10" aria-hidden><path d="M13 1 L17 5 L13 9 M1 5 H17" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>

      <p className="fleet-shelf__hint mono" aria-hidden>
        {films.find((a) => a.id === activeId)?.transmission || 'OPEN DOSSIER'}
      </p>
    </div>
  )
}

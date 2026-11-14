/**
 * React Bits SplitText (JS + CSS) — adapted for Silent Fleet.
 * Source: https://reactbits.dev/r/SplitText-JS-CSS
 * Club GSAP SplitText omitted — characters/words are split manually.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const DEFAULT_FROM = { opacity: 0, y: 40 }
const DEFAULT_TO = { opacity: 1, y: 0 }

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const fontsAreLoaded = () => typeof document !== 'undefined' && (!document.fonts || document.fonts.status === 'loaded')

const waveEase = (t) => 1 - Math.cos(t * Math.PI * 1.5) * Math.pow(1 - t, 1.2)

const getEffect = (effect, em) => {
  switch (effect) {
    case 'fade':
      return { from: { opacity: 0 }, to: { opacity: 1 }, ease: 'power2.inOut' }
    case 'blur':
      return {
        from: { opacity: 0, filter: `blur(${Math.round(em * 1.4) / 10}px)` },
        to: { opacity: 1, filter: 'blur(0px)' },
        ease: 'power2.out',
      }
    case 'flip': {
      const setup = { transformPerspective: em * 6, transformOrigin: '50% 100%' }
      return {
        from: { ...setup, opacity: 0, rotationX: -90 },
        to: { ...setup, opacity: 1, rotateX: 0 },
        ease: 'power3.out',
      }
    }
    case 'pop':
      return { from: { opacity: 0, scale: 0 }, to: { opacity: 1, scale: 1 }, ease: 'back.out(1.6)' }
    case 'skew':
      return {
        from: { transformOrigin: '50% 100%', opacity: 0, x: -em * 0.4, skewX: -24 },
        to: { transformOrigin: '50% 100%', opacity: 1, x: 0, skewX: 0 },
        ease: 'expo.out',
      }
    case 'wave':
      return { from: { opacity: 0, y: em * 0.45 }, to: { opacity: 1, y: 0 }, ease: waveEase }
    default:
      return { from: { ...DEFAULT_FROM }, to: { ...DEFAULT_TO }, ease: 'power3.out' }
  }
}

/** Manual split — replaces Club GSAP SplitText for open-source builds. */
function buildPieces(text, splitType) {
  const wantChars = splitType.includes('chars')
  const wantWords = splitType.includes('words') || wantChars
  const words = String(text ?? '').split(/(\s+)/)
  const nodes = []
  words.forEach((token, wi) => {
    if (/^\s+$/.test(token)) {
      nodes.push({ key: `s-${wi}`, type: 'space', text: token })
      return
    }
    if (!token) return
    if (wantChars) {
      ;[...token].forEach((ch, ci) => {
        nodes.push({ key: `c-${wi}-${ci}`, type: 'char', text: ch })
      })
    } else if (wantWords) {
      nodes.push({ key: `w-${wi}`, type: 'word', text: token })
    } else {
      nodes.push({ key: `w-${wi}`, type: 'word', text: token })
    }
  })
  return nodes
}

const SplitText = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease,
  splitType = 'chars',
  from,
  to,
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  staggerFrom = 'start',
  mask = false,
  effect = 'rise',
  trigger = 'view',
  loop = false,
  loopDelay = 1.5,
  hoverEffect = 'none',
  color,
  accentColor,
  onLetterAnimationComplete,
}) => {
  const ref = useRef(null)
  const completedTextRef = useRef(null)
  const onCompleteRef = useRef(onLetterAnimationComplete)
  const liveRef = useRef({ trigger, hoverEffect, accentColor })
  const [fontsLoaded, setFontsLoaded] = useState(fontsAreLoaded)
  const [ready, setReady] = useState(false)
  const pieces = useMemo(() => buildPieces(text, splitType), [text, splitType])

  useIsoLayoutEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete
    liveRef.current = { trigger, hoverEffect, accentColor }
  })

  useEffect(() => {
    if (fontsLoaded) return undefined
    let active = true
    document.fonts.ready.then(() => {
      if (active) setFontsLoaded(true)
    })
    return () => {
      active = false
    }
  }, [fontsLoaded])

  useGSAP(
    () => {
      const el = ref.current
      if (!el || !text || !fontsLoaded) return
      el.getBoundingClientRect()
      if (!fontsAreLoaded()) {
        setFontsLoaded(false)
        return
      }

      const finish = () => {
        if (completedTextRef.current === text) return
        completedTextRef.current = text
        onCompleteRef.current?.()
      }

      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setReady(true)
        finish()
        return
      }

      const targets = el.querySelectorAll('.split-char, .split-word')
      if (!targets.length) {
        setReady(true)
        finish()
        return
      }

      const startPct = (1 - threshold) * 100
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin)
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px'
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`
      const start = `top ${startPct}%${sign}`

      const em = parseFloat(getComputedStyle(el).fontSize) || 16
      const custom = from !== undefined || to !== undefined
      const look = getEffect(effect, em)
      const fromVars = custom ? { ...(from || DEFAULT_FROM) } : look.from
      const toVars = custom ? { ...(to || DEFAULT_TO) } : look.to
      const easing = ease || (custom ? 'power3.out' : look.ease)
      const order = gsap.utils.distribute({ each: delay / 1000, from: staggerFrom })
      const exit = Math.max(0.35, duration * 0.55)

      let revealed = completedTextRef.current === text
      let busy = null
      let queued = null

      const reveal = (initial, vars) => {
        const accent = liveRef.current.accentColor
        const tl = gsap.timeline(vars)
        tl.fromTo(
          targets,
          { ...fromVars, willChange: 'transform, opacity' },
          { ...toVars, duration, ease: easing, stagger: order, immediateRender: initial },
          0,
        )
        if (accent) {
          tl.fromTo(
            targets,
            { color: accent },
            {
              color: getComputedStyle(el).color,
              duration: duration * 0.7,
              ease: 'power1.inOut',
              stagger: order,
              immediateRender: initial,
            },
            duration * 0.3,
          )
        }
        return tl
      }

      const conceal = () => {
        const accent = liveRef.current.accentColor
        const tl = gsap.timeline()
        tl.fromTo(
          targets,
          { ...toVars, willChange: 'transform, opacity' },
          { ...fromVars, duration: exit, ease: 'power2.in', stagger: order, immediateRender: false },
          0,
        )
        if (accent) tl.to(targets, { color: accent, duration: exit, ease: 'power1.in', stagger: order }, 0)
        return tl
      }

      const cycle = () => {
        if (busy || !revealed || !targets.length) return
        queued?.kill()
        queued = null
        busy = gsap
          .timeline({
            onComplete: () => {
              busy = null
              queue()
            },
          })
          .add(conceal(), 0)
          .add(reveal(false), exit)
      }

      const queue = () => {
        queued?.kill()
        queued = loop ? gsap.delayedCall(loopDelay, cycle) : null
      }

      const onEnter = () => {
        if (!revealed) return
        if (liveRef.current.trigger === 'hover') cycle()
      }

      const onClick = () => {
        if (liveRef.current.trigger === 'click') cycle()
      }

      setReady(true)

      if (!revealed) {
        busy = reveal(true, {
          scrollTrigger:
            trigger === 'load'
              ? undefined
              : { trigger: el, start, once: true, fastScrollEnd: true, anticipatePin: 0.4 },
          onComplete: () => {
            revealed = true
            busy = null
            finish()
            queue()
          },
        })
      } else {
        queue()
      }

      el.addEventListener('pointerenter', onEnter)
      el.addEventListener('click', onClick)

      return () => {
        queued?.kill()
        busy?.kill()
        el.removeEventListener('pointerenter', onEnter)
        el.removeEventListener('click', onClick)
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill()
        })
      }
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        staggerFrom,
        mask,
        effect,
        trigger,
        loop,
        loopDelay,
        fontsLoaded,
        pieces,
      ],
      scope: ref,
      revertOnUpdate: true,
    },
  )

  const Tag = tag || 'p'
  const clip =
    hoverEffect === 'none' && (from !== undefined || to !== undefined || effect === 'rise' || effect === 'fade')

  return (
    <Tag
      key={text}
      ref={ref}
      className={`split-parent ${className}`.trim()}
      style={{
        textAlign,
        overflow: clip ? 'hidden' : 'visible',
        display: 'inline-block',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        color,
        cursor: trigger === 'click' ? 'pointer' : undefined,
        visibility: ready ? undefined : 'hidden',
      }}
    >
      {pieces.map((p) => {
        if (p.type === 'space') return <span key={p.key}>{p.text}</span>
        if (p.type === 'char') {
          return (
            <span key={p.key} className="split-word" style={{ display: 'inline-block' }}>
              <span className="split-char" style={{ display: 'inline-block' }}>{p.text}</span>
            </span>
          )
        }
        return (
          <span key={p.key} className="split-word" style={{ display: 'inline-block' }}>
            {p.text}
          </span>
        )
      })}
    </Tag>
  )
}

export default SplitText

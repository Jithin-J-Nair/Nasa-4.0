/* eslint-disable react/no-unknown-property */
/**
 * ContinuumCanvas — diegetic scene events, not overlay stickers.
 * Moon / Mars as place · Meridiani dust · carrier death as physics.
 * Material system: albedo + height AO/roughness + GGX + ASC-CDL grade.
 */
import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useTexture, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import * as THREE from 'three'
import gsap from 'gsap'
import { sampleActs, lerp, clamp, smoothstep, easeInOutCubic } from './film'
import { latLonToLocal, SITE_FOCUS } from './geo'
import { filmProgressRef } from '../motion/engine'
import { ARTIFACTS } from '../data/artifacts'

const MOON_SITES = ARTIFACTS.filter((a) => a.body === 'moon' && Number.isFinite(a.lat) && Number.isFinite(a.lon))
const MARS_SITES = ARTIFACTS.filter((a) => a.body === 'mars' && Number.isFinite(a.lat) && Number.isFinite(a.lon))

/** Click-hold drag rotates a planet on Y (Moon Atlas / Mars Meridiani). */
const PLANET_DRAG_SLOP = 8

function usePlanetYawDrag(enabled, reduced, onDraggingChange) {
  const yaw = useRef(0)
  const targetYaw = useRef(0)
  const dragging = useRef(false)
  const pending = useRef(false)
  const originX = useRef(0)
  const originY = useRef(0)
  const lastClientX = useRef(0)
  const activePointer = useRef(null)
  const { gl, size } = useThree()

  useEffect(() => {
    if (!enabled || reduced) {
      targetYaw.current = 0
      dragging.current = false
      pending.current = false
      activePointer.current = null
      onDraggingChange?.(false)
      return undefined
    }

    const el = gl.domElement

    const clearDrag = (e) => {
      const was = dragging.current
      pending.current = false
      dragging.current = false
      activePointer.current = null
      if (was) onDraggingChange?.(false)
      try {
        if (e?.pointerId != null) el.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }

    const onDown = (e) => {
      // Only the WebGL canvas — Html hotspot hits are a different target
      if (e.target !== el) return
      if (e.button != null && e.button !== 0) return
      pending.current = true
      dragging.current = false
      activePointer.current = e.pointerId
      originX.current = e.clientX
      originY.current = e.clientY
      lastClientX.current = e.clientX
    }

    const onMove = (e) => {
      if (activePointer.current != null && e.pointerId !== activePointer.current) return

      if (pending.current && !dragging.current) {
        const ax = e.clientX - originX.current
        const ay = e.clientY - originY.current
        if (Math.abs(ax) < PLANET_DRAG_SLOP && Math.abs(ay) < PLANET_DRAG_SLOP) return
        // Vertical intent → abandon so Lenis / pan-y can scroll
        if (Math.abs(ay) > Math.abs(ax)) {
          clearDrag(e)
          return
        }
        dragging.current = true
        pending.current = false
        lastClientX.current = e.clientX
        onDraggingChange?.(true)
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }

      if (!dragging.current) return
      const dx = e.clientX - lastClientX.current
      lastClientX.current = e.clientX
      // Drag left → surface moves left; drag right → left-to-right
      const radPerPx = (Math.PI * 1.25) / Math.max(1, size.width)
      targetYaw.current += dx * radPerPx
    }

    // Hover + wheel → OptionScroll-style yaw (rotate globe without dragging)
    let hovering = false
    const onEnter = () => { hovering = true }
    const onLeave = () => { hovering = false }
    const onWheel = (e) => {
      if (!hovering && e.target !== el) return
      // Prefer horizontal intent; allow vertical wheel to yaw when hovering the globe
      e.preventDefault()
      const delta = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY
      const radPerPx = (Math.PI * 1.35) / Math.max(1, size.width)
      targetYaw.current += delta * radPerPx * 0.55
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', clearDrag)
    el.addEventListener('pointercancel', clearDrag)
    el.addEventListener('lostpointercapture', clearDrag)
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', clearDrag)
      el.removeEventListener('pointercancel', clearDrag)
      el.removeEventListener('lostpointercapture', clearDrag)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('wheel', onWheel)
      dragging.current = false
      pending.current = false
      activePointer.current = null
      onDraggingChange?.(false)
    }
  }, [enabled, reduced, gl, size.width, onDraggingChange])

  useFrame((_, dt) => {
    const step = Math.min(0.05, Math.max(0.001, dt))
    if (!enabled) {
      targetYaw.current = lerp(targetYaw.current, 0, Math.min(1, 3.5 * step))
    }
    yaw.current = lerp(yaw.current, targetYaw.current, Math.min(1, (dragging.current ? 22 : 12) * step))
  })

  const reset = useCallback(() => {
    targetYaw.current = 0
    yaw.current = 0
  }, [])

  return { yaw, reset }
}

/* ─── planet material system ─── */
const PLANET_VERT = `
uniform float uHeightScale;
uniform sampler2D uHeightMap;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
varying float vH;
void main(){
  vUv = uv;
  vec3 nrm = normalize(position);
  float h = texture2D(uHeightMap, uv).r;
  vec3 newPos = nrm * (1.0 + (h - 0.5) * uHeightScale);
  vH = h;
  vN = normalize(normalMatrix * nrm);
  vec4 world = modelMatrix * vec4(newPos, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const PLANET_FRAG = `
uniform float uTime;
uniform float uBody;
uniform vec3 uRim;
uniform float uBump;
uniform float uExposure;
uniform vec3 uSunDir;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uStorm;
uniform float uDark;
uniform float uAOStrength;
uniform sampler2D uColorMap;
uniform sampler2D uHeightMap;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
varying float vH;

float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

void main(){
  // Albedo first — planet must read as a world, not a shader disc
  vec3 tex = texture2D(uColorMap, vUv).rgb;
  tex = pow(max(tex, vec3(0.001)), vec3(mix(0.9, 0.92, uBody)));
  // Mild contrast without crushing maria / highlands
  tex = clamp((tex - 0.5) * mix(1.12, 1.06, uBody) + 0.5, 0.0, 1.0);

  float h = texture2D(uHeightMap, vUv).r;
  float ao = mix(1.0, smoothstep(0.15, 0.7, h), uAOStrength);
  ao = mix(ao, ao * 0.55, uDark);

  vec3 N = normalize(vN);
  vec3 dp1 = dFdx(vWorld);
  vec3 dp2 = dFdy(vWorld);
  float hl = length(dp1) * length(dp2);
  // Guard derivatives — avoid concentric banding at grazing angles
  if (hl > 1e-8) {
    vec2 duv1 = dFdx(vUv);
    vec2 duv2 = dFdy(vUv);
    vec3 T = normalize(dp1 * duv2.y - dp2 * duv1.y);
    vec3 B = normalize(-dp1 * duv2.x + dp2 * duv1.x);
    float bump = uBump * (1.0 - uStorm * 0.35);
    N = normalize(N - (T * dFdx(h) + B * dFdy(h)) * bump);
  }

  float rough = mix(0.86, 0.48, smoothstep(0.28, 0.82, h));
  rough = mix(rough, 0.96, uStorm * uBody);
  rough = clamp(rough + uDark * 0.1, 0.4, 0.98);

  vec3 L = normalize(uSunDir);
  vec3 Lfill = normalize(vec3(-0.55, -0.12, -0.45));
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = max(dot(N, L), 0.0);
  // Soft terminator — lunar limb, not hard cut
  float term = smoothstep(-0.12, 0.28, ndl);
  float night = 1.0 - term;

  vec3 albedo = tex;
  if (uStorm > 0.01 && uBody > 0.5) {
    float n = hash21(vUv * 48.0 + uTime * 2.4);
    float sheet = hash21(vUv * vec2(6.0, 18.0) + vec2(uTime * 1.6, 0.0));
    vec3 dust = vec3(0.52, 0.26, 0.1) * (0.65 + 0.35 * n);
    albedo = mix(albedo, dust, uStorm * (0.7 + 0.25 * sheet));
  }

  float hemi = N.y * 0.5 + 0.5;
  vec3 ambient = albedo * mix(0.06, 0.14, hemi) * ao;
  vec3 key = albedo * ndl * mix(1.35, 1.15, uBody) * mix(0.18, 1.0, term) * ao;
  vec3 fill = albedo * max(dot(N, Lfill), 0.0) * 0.16 * mix(0.35, 1.0, term) * ao;

  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float a = max(rough * rough, 0.04);
  float a2 = a * a;
  float dDen = max(3.14159 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0), 1e-4);
  float spec = (a2 / dDen) * (1.0 - rough) * mix(0.12, 0.28, uBody) * term * (1.0 - uDark * 0.65);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.4);
  vec3 rim = uRim * fres * mix(0.55, 0.28, uBody) * term * (1.0 - uStorm * 0.75);
  vec3 nightGlow = mix(vec3(0.018, 0.024, 0.045), vec3(0.05, 0.016, 0.008), uBody) * night * 0.45 * (1.0 - uDark);

  vec3 col = ambient + key + fill + rim + nightGlow + vec3(spec);
  col *= uExposure * (1.0 - uDark * 0.5);
  col = col * uGain + uLift;
  col = pow(max(col, 0.0), vec3(0.95));
  gl_FragColor = vec4(col, 1.0);
}
`

const ATMO_VERT = `
varying vec3 vN;
varying vec3 vWorld;
void main(){
  vN = normalize(normalMatrix * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const ATMO_FRAG = `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
varying vec3 vN;
varying vec3 vWorld;
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float f = pow(1.0 - max(dot(normalize(vN), V), 0.0), uPower);
  float a = f * uIntensity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`

const STAR_VERT = `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
uniform float uWarp;
uniform float uDark;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec3 p = position;
  p += vec3(sin(uTime*0.01+aSeed), cos(uTime*0.012+aSeed*2.0), sin(uTime*0.008+aSeed))*0.12;
  // Journey warp: forward streaks only — no radial zoom pulse
  float w = uWarp;
  vec3 radial = normalize(p + 1e-4);
  p += radial * w * (2.0 + aSeed * 10.0);
  p.z -= w * (18.0 + aSeed * 36.0);
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float tw = 0.7 + 0.3*sin(uTime*(0.5+aSeed*2.0)+aSeed*12.0);
  vAlpha = tw * mix(1.0, 0.65 + w * 0.55, w) * (1.0 - uDark * 0.55);
  float streak = 1.0 + w * (1.6 + aSeed * 3.2);
  gl_PointSize = clamp(aSize * uPixelRatio * (72.0 / max(0.5, -mv.z)) * streak, 0.55, mix(2.2, 5.2, w));
  gl_Position = projectionMatrix * mv;
}
`
const STAR_FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  // Hard core — kills the tan circular particle look
  float a = smoothstep(0.45, 0.12, d) * vAlpha;
  if(a < 0.04) discard;
  gl_FragColor = vec4(vColor, a);
}
`

/* World-space dust curtains — Meridiani as a place */
const DUST_SHEET_VERT = `
varying vec2 vUv;
varying vec3 vWorld;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const DUST_SHEET_FRAG = `
uniform float uTime;
uniform float uStorm;
uniform float uDark;
varying vec2 vUv;
varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
void main(){
  float n1 = noise(vUv * vec2(2.5, 7.0) + vec2(uTime * 0.55, uTime * 0.12));
  float n2 = noise(vUv * vec2(6.0, 2.2) - vec2(uTime * 0.35, -uTime * 0.4));
  float dens = n1 * n2;
  float edge = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
  float a = uStorm * dens * edge * (0.45 + uDark * 0.4);
  if (a < 0.02) discard;
  vec3 col = mix(vec3(0.55, 0.28, 0.1), vec3(0.25, 0.1, 0.04), dens);
  col *= 1.0 - uDark * 0.55;
  gl_FragColor = vec4(col, a);
}
`

const DUST_VERT = `
attribute float aSeed;
attribute float aSize;
uniform float uTime;
uniform float uStorm;
uniform float uPixelRatio;
varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * (1.2 + aSeed) + aSeed * 20.0) * 0.55 * uStorm;
  p.y += fract(uTime * 0.18 * (0.5+aSeed) + aSeed) * -3.2 * uStorm;
  p.z += cos(uTime * 0.8 + aSeed * 10.0) * 0.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vA = uStorm * (0.35 + 0.65 * fract(aSeed * 7.1));
  gl_PointSize = clamp(aSize * uPixelRatio * (70.0 / -mv.z) * (0.4 + uStorm * 0.5), 0.5, 3.0);
  gl_Position = projectionMatrix * mv;
}
`
const DUST_FRAG = `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.12, d) * vA;
  if (a < 0.02) discard;
  gl_FragColor = vec4(0.68, 0.34, 0.12, a);
}
`

function Starfield({ count = 7000, warpRef, darkRef }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 38 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      // Tiny distant stars only — no large soft discs
      size[i] = 0.55 + Math.random() * 0.65
      seed[i] = Math.random()
      col[i * 3] = 0.82 + Math.random() * 0.18
      col[i * 3 + 1] = 0.88 + Math.random() * 0.12
      col[i * 3 + 2] = 0.95 + Math.random() * 0.05
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.75) },
      uWarp: { value: 0 },
      uDark: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uWarp.value = warpRef?.current ?? 0
    mat.uniforms.uDark.value = darkRef?.current ?? 0
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

function DustField({ count = 1600, stormRef }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const size = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 7
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5.5 - 0.8
      seed[i] = Math.random()
      size[i] = 0.35 + Math.random() * 0.85
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    return g
  }, [count])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uStorm: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.6) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  const pts = useRef()
  useFrame((s) => {
    const storm = stormRef?.current ?? 0
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uStorm.value = storm
    // Only during Meridiani storm — never as Atlas bokeh
    if (pts.current) pts.current.visible = storm > 0.12
  })
  return <points ref={pts} geometry={geo} material={mat} position={[2.6, 0.3, -0.5]} frustumCulled={false} visible={false} />
}

function DustSheets({ stormRef, darkRef, sunDirRef }) {
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.ShaderMaterial({
    vertexShader: DUST_SHEET_VERT,
    fragmentShader: DUST_SHEET_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uStorm: { value: 0 },
      uDark: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })), [])

  const group = useRef()
  useFrame((s) => {
    const storm = stormRef?.current ?? 0
    const dark = darkRef?.current ?? 0
    mats.forEach((m, i) => {
      m.uniforms.uTime.value = s.clock.elapsedTime + i * 1.7
      m.uniforms.uStorm.value = storm
      m.uniforms.uDark.value = dark
    })
    if (group.current) group.current.visible = storm > 0.18
    void sunDirRef
  })

  return (
    <group ref={group} position={[2.7, 0.2, -0.4]} visible={false}>
      {mats.map((m, i) => (
        <mesh key={i} rotation={[0, (i - 1) * 0.55, i * 0.08]} position={[i * 0.15 - 0.15, 0.1, -0.2 * i]}>
          <planeGeometry args={[4.2, 2.8, 1, 1]} />
          <primitive object={m} attach="material" />
        </mesh>
      ))}
    </group>
  )
}


/** Keep hotspot dossier cards fully inside the viewport (Mars right-limb safe). */
function placeHotspotCard(card, uiRoot, size, screenXY) {
  if (!card || typeof document === 'undefined') return
  const pad = 16
  const vw = size?.width || window.innerWidth
  const vh = size?.height || window.innerHeight
  const cw = Math.min(card.offsetWidth || 360, vw - pad * 2)
  const ch = Math.min(card.offsetHeight || 320, vh - pad * 2)

  const hit = uiRoot?.querySelector?.('.moon-hotspot-hit')
  const pin = hit?.getBoundingClientRect?.()
  const pinAlive = pin
    && !(pin.width === 0 && pin.height === 0 && pin.left === 0 && pin.top === 0)
    && Number.isFinite(pin.left)
    && pin.left > -vw
    && pin.left < vw * 2

  // Prefer live hit rect; else projected 3D site; else never leave the card at 0,0
  let pinCx
  let pinCy
  let pinBottom
  let pinTop
  let pinLeft
  let pinRight
  if (pinAlive) {
    pinCx = pin.left + pin.width / 2
    pinCy = pin.top + pin.height / 2
    pinBottom = pin.bottom
    pinTop = pin.top
    pinLeft = pin.left
    pinRight = pin.right
  } else if (screenXY && Number.isFinite(screenXY.x) && Number.isFinite(screenXY.y)) {
    pinCx = screenXY.x
    pinCy = screenXY.y
    pinBottom = screenXY.y + 10
    pinTop = screenXY.y - 10
    pinLeft = screenXY.x - 10
    pinRight = screenXY.x + 10
  } else {
    // Safe readable dock — never the top-left corner flash
    pinCx = vw * 0.58
    pinCy = vh * 0.42
    pinBottom = pinCy + 12
    pinTop = pinCy - 12
    pinLeft = pinCx - 12
    pinRight = pinCx + 12
  }

  // Prefer under the pin, centered (image-2 grammar)
  let left = pinCx - cw / 2
  let top = pinBottom + 14

  // Near right limb → bias card left of pin; near left → bias right
  if (pinCx > vw * 0.58) {
    left = pinLeft - cw - 14
  } else if (pinCx < vw * 0.32) {
    left = pinRight + 14
  }

  // Keep clear of OptionWheel HUD on the left
  const wheelGuard = Math.min(vw * 0.34, 280)
  left = Math.min(Math.max(Math.max(pad, wheelGuard), left), vw - pad - cw)

  if (top + ch > vh - pad) {
    top = pinTop - 14 - ch
  }
  if (top < pad) {
    top = pad
  }
  top = Math.min(Math.max(pad, top), vh - pad - ch)

  card.style.position = 'fixed'
  card.style.left = `${Math.round(left)}px`
  card.style.top = `${Math.round(top)}px`
  card.style.right = 'auto'
  card.style.bottom = 'auto'
  card.style.transform = 'none'
  card.style.zIndex = '140'
  card.style.maxWidth = `${Math.min(360, vw - pad * 2)}px`
  card.style.opacity = '1'
  card.style.visibility = 'visible'
  card.dataset.placed = '1'
}

function SiteBeacon({
  site,
  hotspotRef,
  color = '#8ec8ff',
  interactive = false,
  visibleRef,
  cardOpen = false,
  mobile = false,
  onHover,
  onLeave,
  onOpen,
  onReveal,
}) {
  const frontRef = useRef()
  const frontMesh = useRef()
  const limbRef = useRef()
  const limbMesh = useRef()
  const uiRef = useRef()
  const limbUiRef = useRef()
  const cardRef = useRef()
  // latLonToLocal returns [x,y,z] — keep both array (R3F position) and Vector3 (facing math)
  const posArr = useMemo(() => latLonToLocal(site.lat, site.lon, 1.012), [site.lat, site.lon])
  const localNrm = useMemo(
    () => new THREE.Vector3(posArr[0], posArr[1], posArr[2]).normalize(),
    [posArr],
  )
  const worldPos = useMemo(() => new THREE.Vector3(), [])
  const worldNrm = useMemo(() => new THREE.Vector3(), [])
  const toCam = useMemo(() => new THREE.Vector3(), [])
  const camLocal = useMemo(() => new THREE.Vector3(), [])
  const limbLocal = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const { size } = useThree()

  // First paint — project site to screen so the card never flashes at 0,0
  useLayoutEffect(() => {
    if (!cardOpen) return undefined
    const id = requestAnimationFrame(() => {
      placeHotspotCard(cardRef.current, uiRef.current, size, null)
    })
    return () => cancelAnimationFrame(id)
  }, [cardOpen, site.id, size.width, size.height])

  useFrame((s) => {
    if (!frontRef.current || !limbRef.current) return
    const stageOn = (visibleRef?.current ?? 0) > 0.42 && interactive

    // Always know where the site is in screen space while its card is open
    frontRef.current.getWorldPosition(worldPos)
    const ndc = worldPos.clone().project(s.camera)
    const screenXY = {
      x: (ndc.x * 0.5 + 0.5) * s.size.width,
      y: (-ndc.y * 0.5 + 0.5) * s.size.height,
    }

    if (!stageOn) {
      frontRef.current.visible = false
      limbRef.current.visible = false
      if (uiRef.current) {
        uiRef.current.style.opacity = '0'
        uiRef.current.style.visibility = 'hidden'
        uiRef.current.style.pointerEvents = 'none'
      }
      if (limbUiRef.current) {
        limbUiRef.current.style.opacity = '0'
        limbUiRef.current.style.visibility = 'hidden'
        limbUiRef.current.style.pointerEvents = 'none'
      }
      // OptionWheel can open a card while stage chrome flickers — still dock it
      if (cardOpen && cardRef.current) {
        placeHotspotCard(cardRef.current, uiRef.current, s.size, screenXY)
      }
      return
    }

    // Facing test in world space
    worldNrm.copy(localNrm)
    if (frontRef.current.parent) {
      worldNrm.transformDirection(frontRef.current.parent.matrixWorld)
    }
    toCam.copy(s.camera.position).sub(worldPos).normalize()
    const facing = worldNrm.dot(toCam) > 0.08

    // Front pin — full interactive hotspot
    frontRef.current.visible = facing
    if (uiRef.current) {
      uiRef.current.style.opacity = facing ? '1' : '0'
      uiRef.current.style.pointerEvents = facing ? 'auto' : 'none'
      uiRef.current.style.visibility = facing ? 'visible' : 'hidden'
    }
    // Place whenever the card is open — even if the pin is on the far limb
    if (cardOpen && cardRef.current) {
      placeHotspotCard(cardRef.current, uiRef.current, s.size, screenXY)
    }
    if (facing && frontMesh.current) {
      const active = hotspotRef?.current === site.id || cardOpen
      const pulse = active ? 0.5 + Math.sin(s.clock.elapsedTime * 3.6) * 0.22 : 0.32
      frontMesh.current.scale.setScalar(active ? 1.2 + pulse * 0.25 : 0.9)
      frontMesh.current.material.opacity = pulse
    }

    // Far-side echo — park a pulsing limb marker so users know to drag/rotate
    const showLimb = !facing
    limbRef.current.visible = showLimb
    if (limbUiRef.current) {
      limbUiRef.current.style.opacity = showLimb ? '1' : '0'
      limbUiRef.current.style.pointerEvents = showLimb ? 'auto' : 'none'
      limbUiRef.current.style.visibility = showLimb ? 'visible' : 'hidden'
    }
    if (!showLimb || !limbMesh.current || !frontRef.current.parent) return

    // Camera direction in the rotating mesh's local space
    frontRef.current.parent.worldToLocal(camLocal.copy(s.camera.position)).normalize()
    // Project site normal onto the view-facing silhouette disc
    limbLocal.copy(localNrm).addScaledVector(camLocal, -localNrm.dot(camLocal))
    if (limbLocal.lengthSq() < 1e-5) {
      tmp.set(1, 0, 0).cross(camLocal)
      if (tmp.lengthSq() < 1e-5) tmp.set(0, 1, 0).cross(camLocal)
      limbLocal.copy(tmp)
    }
    limbLocal.normalize().multiplyScalar(1.02)
    limbRef.current.position.copy(limbLocal)

    const t = s.clock.elapsedTime
    const sonar = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4 + localNrm.x * 6.0))
    limbMesh.current.scale.setScalar(0.7 + sonar * 0.55)
    limbMesh.current.material.opacity = 0.22 + sonar * 0.45
  })

  const pinR = mobile ? 0.014 : 0.0075
  const limbR = mobile ? 0.011 : 0.006
  // Ritual: first tap opens the in-world card; second tap / CTA opens the dossier
  const selectOrOpen = (e) => {
    e?.stopPropagation?.()
    if (cardOpen) onOpen?.(site)
    else onHover?.(site)
  }
  const openDossier = (e) => {
    e?.stopPropagation?.()
    onOpen?.(site)
  }
  const revealSite = (e) => {
    e?.stopPropagation?.()
    onReveal?.(site)
  }

  return (
    <>
      <group ref={frontRef} position={posArr} visible={false}>
        <mesh ref={frontMesh} renderOrder={2}>
          <sphereGeometry args={[pinR, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
        </mesh>
        {interactive && (
          <Html
            center
            distanceFactor={site.body === 'mars' ? (mobile ? 2.8 : 3.4) : (mobile ? 2.0 : 2.35)}
            zIndexRange={[80, 0]}
            style={{ pointerEvents: 'none' }}
            occlude={false}
            wrapperClass="hotspot-html"
          >
            <div className={`moon-hotspot ${site.body === 'mars' ? 'moon-hotspot--mars' : ''} ${mobile ? 'is-touch' : ''}`} ref={uiRef} style={{ opacity: 0, visibility: 'hidden' }}>
              <button
                type="button"
                className={`moon-hotspot-hit ${site.body === 'mars' ? 'moon-hotspot-hit--mars' : ''} ${cardOpen ? 'on' : ''}`}
                aria-label={`${site.name} at ${site.coords}`}
                onMouseEnter={() => onHover?.(site)}
                onFocus={() => onHover?.(site)}
                onMouseLeave={() => onLeave?.(site)}
                onBlur={() => onLeave?.(site)}
                onClick={selectOrOpen}
              />
              {cardOpen && typeof document !== 'undefined' && createPortal(
                <article
                  ref={cardRef}
                  className={`moon-hotspot-card moon-hotspot-card--viewport moon-hotspot-card--split${site.body === 'mars' ? ' moon-hotspot-card--mars' : ''}`}
                  role="dialog"
                  aria-label={site.name}
                >
                  {site.image && (
                    <div className={`nasa-media body-${site.body} moon-hotspot-card__media`}>
                      <img src={site.image} alt={site.imageAlt || site.name} loading="lazy" decoding="async" />
                      <span className="credit">{site.credit}</span>
                    </div>
                  )}
                  <div className="moon-hotspot-card__copy">
                    <p className="kicker">{site.mission} · {site.status}</p>
                    <h3>{site.name}</h3>
                    <p className="mono coords">{site.coords}</p>
                    <p className="blurb">{site.science}</p>
                    <button type="button" className="mono open moon-hotspot-open" onClick={openDossier}>
                      OPEN DOSSIER →
                    </button>
                  </div>
                </article>,
                document.body,
              )}
            </div>
          </Html>
        )}
      </group>

      {/* Limb echo — far-side sites pulse on the silhouette to invite a drag/rotate */}
      <group ref={limbRef} visible={false}>
        <mesh ref={limbMesh} renderOrder={3}>
          <sphereGeometry args={[limbR, 10, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
        </mesh>
        {interactive && (
          <Html
            center
            distanceFactor={mobile ? 2.2 : 2.6}
            zIndexRange={[70, 0]}
            style={{ pointerEvents: 'none' }}
            occlude={false}
            wrapperClass="hotspot-html"
          >
            <div className={`moon-hotspot moon-hotspot--limb ${mobile ? 'is-touch' : ''}`} ref={limbUiRef} style={{ opacity: 0, visibility: 'hidden' }}>
              <button
                type="button"
                className="moon-hotspot-limb"
                aria-label={`Rotate to reveal ${site.name}`}
                title={`Drag to reveal ${site.name}`}
                onClick={revealSite}
              >
                <span className="moon-hotspot-limb__ring" aria-hidden />
                <span className="moon-hotspot-limb__ring moon-hotspot-limb__ring--delay" aria-hidden />
                <span className="moon-hotspot-limb__core" aria-hidden />
              </button>
            </div>
          </Html>
        )}
      </group>
    </>
  )
}

function BodySphere({
  body = 0,
  rim = '#9ecfff',
  mobile = false,
  spin = 0.014,
  colorPath,
  heightPath,
  groupRef,
  gradeRef,
  stormRef,
  darkRef,
  sunDirRef,
  sites = [],
  hotspotRef,
  aimLonRef,
  yawOffsetRef,
  beaconsVisibleRef,
  hotspotsInteractive = false,
  cardSiteId = null,
  onHotspotHover,
  onHotspotLeave,
  onHotspotOpen,
  onHotspotReveal,
}) {
  const mesh = useRef()
  const isMars = body > 0.5
  const [colorMap, heightMap] = useTexture([colorPath, heightPath])

  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace
    heightMap.colorSpace = THREE.NoColorSpace
    ;[colorMap, heightMap].forEach((tex) => {
      tex.anisotropy = 16
      // Clamp — never tile planetary maps (breaks geographic placement)
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.needsUpdate = true
    })
  }, [colorMap, heightMap])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBody: { value: body },
    // Gentle relief from albedo-derived height — readable, not potato
    uHeightScale: { value: isMars ? 0.014 : 0.0055 },
    uBump: { value: isMars ? 2.45 : 1.45 },
    uRim: { value: new THREE.Color(rim) },
    uExposure: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0.85, 0.32, 0.42) },
    uLift: { value: new THREE.Vector3(0.02, 0.03, 0.05) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uStorm: { value: 0 },
    uDark: { value: 0 },
    uAOStrength: { value: isMars ? 0.4 : 0.32 },
    uColorMap: { value: colorMap },
    uHeightMap: { value: heightMap },
  }), [body, isMars, rim, colorMap, heightMap])

  const atmoMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(rim) },
      uIntensity: { value: isMars ? 0.38 : 0.42 },
      uPower: { value: isMars ? 3.8 : 4.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  }), [rim, isMars])

  // SphereGeometry lon0 at local +X; −π/2 swings it to camera +Z. Aim: base − lon.
  const baseYaw = -Math.PI / 2
  // Start facing Eagle (or Mars Meridiani) — first frame matches image-2 front face
  const defaultAim = isMars
    ? SITE_FOCUS.opportunity.aimLon
    : SITE_FOCUS['a11-lm'].aimLon
  const yawSmooth = useRef(baseYaw - (defaultAim * Math.PI) / 180)
  const aimedOnce = useRef(true) // already snapped to defaultAim
  useFrame((s, dt) => {
    uniforms.uTime.value = s.clock.elapsedTime
    const g = gradeRef?.current
    if (g) {
      uniforms.uExposure.value = g.exposure
      uniforms.uLift.value.set(g.lift[0], g.lift[1], g.lift[2])
      uniforms.uGain.value.set(g.gain[0], g.gain[1], g.gain[2])
    }
    if (sunDirRef?.current) uniforms.uSunDir.value.copy(sunDirRef.current)
    uniforms.uStorm.value = isMars ? (stormRef?.current ?? 0) : 0
    uniforms.uDark.value = darkRef?.current ?? 0
    if (mesh.current) {
      const aim = aimLonRef?.current
      const spinMul = isMars ? (1 - (stormRef?.current ?? 0) * 0.92) : 1
      const step = Math.min(0.05, Math.max(0.001, dt))
      if (aim != null && Number.isFinite(aim)) {
        const target = baseYaw - (aim * Math.PI) / 180
        if (!aimedOnce.current) {
          yawSmooth.current = target
          aimedOnce.current = true
        } else {
          let delta = target - yawSmooth.current
          while (delta > Math.PI) delta -= Math.PI * 2
          while (delta < -Math.PI) delta += Math.PI * 2
          yawSmooth.current += delta * Math.min(1, 3.2 * step)
        }
      } else {
        // Soft idle spin only when nothing is aimed (deep-space handoff)
        yawSmooth.current += spin * spinMul * step
        aimedOnce.current = false
      }
      // Atlas user drag is additive yaw on top of the locked site facing
      const userYaw = yawOffsetRef?.current ?? 0
      mesh.current.rotation.y = yawSmooth.current + userYaw
    }
  })

  const segs = mobile ? 96 : (isMars ? 256 : 192)
  const beaconColor = isMars ? '#ff9a6a' : '#8ec8ff'
  return (
    <group ref={groupRef}>
      <group ref={mesh}>
        <mesh>
          <sphereGeometry args={[1, segs, segs]} />
          <shaderMaterial
            vertexShader={PLANET_VERT}
            fragmentShader={PLANET_FRAG}
            uniforms={uniforms}
            extensions={{ derivatives: true }}
          />
        </mesh>
        {sites.map((site) => (
          <SiteBeacon
            key={site.id}
            site={site}
            hotspotRef={hotspotRef}
            color={beaconColor}
            interactive={hotspotsInteractive}
            visibleRef={beaconsVisibleRef}
            cardOpen={cardSiteId === site.id}
            mobile={mobile}
            onHover={onHotspotHover}
            onLeave={onHotspotLeave}
            onOpen={onHotspotOpen}
            onReveal={onHotspotReveal}
          />
        ))}
      </group>
      {/* Mars only — soft limb glow, high tessellation so the rim stays premium */}
      {isMars && (
        <mesh scale={1.048}>
          <sphereGeometry args={[1, mobile ? 48 : 96, mobile ? 48 : 96]} />
          <primitive object={atmoMat} attach="material" />
        </mesh>
      )}
    </group>
  )
}

/** NASA VTAD Voyager — https://science.nasa.gov/resource/voyager-3d-model/ */
const VOYAGER_GLB = '/models/Voyager.glb'

function VoyagerCraft({ groupRef, carrierRef }) {
  const { scene } = useGLTF(VOYAGER_GLB)
  const keyRef = useRef()
  const fillRef = useRef()
  const rimRef = useRef()
  const model = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false
        obj.receiveShadow = false
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => {
            if (!m) return
            // Readability in the dark silence grade — keep NASA materials, lift response
            if ('metalness' in m) m.metalness = Math.min(0.92, (m.metalness ?? 0.4) + 0.15)
            if ('roughness' in m) m.roughness = Math.max(0.22, Math.min(0.62, (m.roughness ?? 0.45) * 0.85))
            if ('envMapIntensity' in m) m.envMapIntensity = 1.45
            m.needsUpdate = true
          })
        }
      }
    })
    // Larger craft — hero of the silence beat
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    box.getSize(size)
    const max = Math.max(size.x, size.y, size.z, 0.001)
    root.scale.setScalar(3.85 / max)
    box.setFromObject(root)
    const center = new THREE.Vector3()
    box.getCenter(center)
    root.position.sub(center)
    // Dish-forward pose toward camera look
    root.rotation.set(0.18, Math.PI * 0.72, 0.08)
    return root
  }, [scene])

  const inner = useRef()
  useFrame((s) => {
    const die = carrierRef?.current ?? 0
    if (inner.current) {
      inner.current.rotation.y = s.clock.elapsedTime * 0.045 * (1 - die * 0.85)
    }
    // Local studio lights stay readable even when the scene grade goes dark
    const lit = 1 - die * 0.35
    if (keyRef.current) keyRef.current.intensity = 2.8 * lit
    if (fillRef.current) fillRef.current.intensity = 1.15 * lit
    if (rimRef.current) rimRef.current.intensity = 1.6 * lit
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Craft-local key / fill / rim — not the carrier beam */}
      <directionalLight
        ref={keyRef}
        position={[2.4, 3.2, 4.5]}
        intensity={2.8}
        color="#fff4e8"
      />
      <directionalLight
        ref={fillRef}
        position={[-3.2, 0.6, 1.5]}
        intensity={1.15}
        color="#9eb6ff"
      />
      <pointLight
        ref={rimRef}
        position={[-0.4, -0.2, -2.8]}
        intensity={1.6}
        color="#ffd2a8"
        distance={14}
        decay={2}
      />
      <ambientLight intensity={0.32} color="#c8d4ea" />
      <group ref={inner}>
        <primitive object={model} />
      </group>
    </group>
  )
}

function useInertiaPointer(mouse, reduced) {
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  useFrame((_, dt) => {
    if (reduced || !mouse?.current) return
    const s = state.current
    const tx = mouse.current.nx
    const ty = mouse.current.ny
    const ax = (tx - s.x) * 12
    const ay = (ty - s.y) * 12
    s.vx = s.vx * 0.88 + ax * dt
    s.vy = s.vy * 0.88 + ay * dt
    s.x += s.vx * dt
    s.y += s.vy * dt
  })
  return state
}

function FilmDirector({
  progress,
  mouse,
  reduced,
  mobile = false,
  moonRef,
  marsRef,
  pioneerRef,
  sunRef,
  fillRef,
  fogRef,
  gradeRef,
  diveRef,
  stormRef,
  carrierRef,
  warpRef,
  darkRef,
  sunDirRef,
  hotspotRef,
  moonAimRef,
  marsAimRef,
  beaconsVisibleRef,
  marsBeaconsVisibleRef,
  onSample,
  onMarsActive,
  atlasLock = false,
  marsLock = false,
  focusSiteId = null,
}) {
  const { camera, gl, scene, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const inertia = useInertiaPointer(mouse, reduced)
  const lastDpr = useRef(1)
  const atlasBlend = useRef(0)
  const filmP = useRef(0)
  const moonPos = useRef(new THREE.Vector3(0, 0, 0))
  // Start closer to framed arrival scale so first paint isn't an overfilled disc
  const moonScale = useRef(mobile ? 1.22 : 1.42)
  const atlasAimLon = useRef(null)
  const marsAimLon = useRef(null)
  const marsHemi = useRef(0)
  /** 0 = center approach · 1 = right-limb lock — continuous rail, no hard jumps */
  const marsSlide = useRef(0)
  const marsPos = useRef(new THREE.Vector3(0.35, 0.1, -2.4))
  const marsScale = useRef(0.4)
  const marsActiveRef = useRef(false)

  useFrame((state, dt) => {
    void progress
    const step = Math.min(0.05, Math.max(0.001, dt))
    // ONE owner: continuum-rail ScrollTrigger → filmProgressRef
    const filmTarget = Number.isFinite(filmProgressRef.current) ? filmProgressRef.current : 0

    // Atlas blend is interaction chrome only — never freezes film tip
    atlasBlend.current = lerp(atlasBlend.current, atlasLock ? 1 : 0, Math.min(1, 1.55 * step))
    const ab = atlasBlend.current

    // Shot-aware catch-up — silk on Moon→Mars + transit, punch only into last light
    const catchUp = filmTarget >= 0.28 && filmTarget < 0.52
      ? 2.65
      : filmTarget >= 0.64 && filmTarget < 0.76
        ? 5.8
        : 3.55
    filmP.current = lerp(filmP.current, filmTarget, Math.min(1, catchUp * step))
    const sample = sampleActs(filmP.current)
    onSample?.(sample)

    const f = sample.focus
    // Arrival + Atlas: lunar leftovers on the front face (must run AFTER f is defined)
    if (beaconsVisibleRef) {
      const moonFront = (f === 'moon' || f === 'dive') ? 0.92 : 0
      beaconsVisibleRef.current = Math.max(ab, moonFront)
    }
    const transit = f === 'transit' || sample.act?.id === 'transit'
    const journey = sample.journey || {
      moonPresence: f === 'moon' || f === 'dive' ? 1 : 0,
      marsPresence: f === 'mars' || f === 'storm' ? 1 : 0,
      moonExit: 0,
      marsApproach: 0,
      warp: sample.event.warp,
    }
    const marsish = f === 'mars' || f === 'storm' || (transit && journey.marsPresence > 0.35)
    // Atlas chrome may linger in IO — never let it mute Mars once the film tip is past dive
    const atlasClear = ab > 0.35 && filmP.current < 0.22
    const marsLive = (!atlasClear && marsish) || (transit && journey.marsPresence > 0.02) || f === 'mars' || f === 'storm'
    // Meridiani stage (wheel / hotspots) — not during pure transit approach
    const marsStage = (f === 'mars' || f === 'storm') && filmP.current >= 0.22

    // Mute diegetic events with blend (not a binary lock) — no dust/bokeh bleed into Atlas
    const eventMute = 1 - ab
    diveRef.current = sample.event.dive * eventMute
    // Soft storm only — hard sheets were painting muddy polygons over Meridiani
    stormRef.current = sample.event.storm * eventMute * (marsStage ? 0.28 : 1)
    carrierRef.current = sample.event.carrier * eventMute
    warpRef.current = sample.event.warp * (0.08 + eventMute * 0.92)
    darkRef.current = sample.dark * (0.08 + eventMute * 0.92) * (marsStage ? 0.45 : (transit ? 0.7 : 1))
    // Force cool lunar grade as Atlas takes over — kills warm/red particle wash on the Moon
    if (ab > 0.45) {
      const g = sample.grade
      gradeRef.current = {
        lift: g.lift.map((v, i) => lerp(v, [0.01, 0.015, 0.04][i], ab)),
        gain: g.gain.map((v, i) => lerp(v, [1.05, 1.06, 1.1][i], ab)),
        exposure: lerp(g.exposure, 1.1, ab),
        grain: lerp(g.grain, 0.03, ab),
      }
    } else if (marsStage) {
      // Crisp Meridiani — readable surface, not a brown mud bath
      const g = sample.grade
      gradeRef.current = {
        lift: g.lift.map((v, i) => lerp(v, [0.04, 0.02, 0.01][i], 0.55)),
        gain: g.gain.map((v, i) => lerp(v, [1.12, 0.95, 0.78][i], 0.55)),
        exposure: lerp(g.exposure, 1.05, 0.4),
        grain: lerp(g.grain, 0.04, 0.5),
      }
    } else {
      gradeRef.current = sample.grade
    }

    if (marsActiveRef.current !== marsStage) {
      marsActiveRef.current = marsStage
      onMarsActive?.(marsStage)
    }
    if (marsBeaconsVisibleRef) {
      marsBeaconsVisibleRef.current = marsStage && marsLock ? 1 : (marsStage ? 0.55 : 0)
    }

    // Hemisphere / slide rail — one continuous 0→1 ease, never a step jump
    let slideTarget = 0
    if (transit) {
      slideTarget = clamp(journey.marsApproach, 0, 1)
    } else if (marsLock && marsStage) {
      slideTarget = 1
    } else if (sample.act?.id === 'mars') {
      slideTarget = lerp(0.72, 1, smoothstep(0.05, 1, sample.eased))
    } else if (sample.act?.id === 'dust_storm' || f === 'storm') {
      slideTarget = 1
    } else if (marsish) {
      slideTarget = lerp(0.55, 0.92, sample.eased)
    }
    // Silk rail — slower catch-up kills the blocky center→right hit
    const stageLockEarly = marsLock && marsStage
    const slideRate = transit ? 1.15 : (stageLockEarly ? 1.65 : 1.95)
    marsSlide.current = lerp(marsSlide.current, marsLive || (transit && journey.marsPresence > 0.02) ? slideTarget : 0, Math.min(1, slideRate * step))
    marsHemi.current = marsSlide.current
    const hemi = marsHemi.current
    const slide = easeInOutCubic(marsSlide.current)

    // Always prefer a real lunar leftover while the Moon is on stage (Arrival front-faces Eagle)
    const moonHotDefault = (
      (focusSiteId && SITE_FOCUS[focusSiteId]?.body === 'moon' && focusSiteId)
      || sample.hotspot
      || 'a11-lm'
    )
    const hot = ab > 0.2
      ? (focusSiteId || sample.hotspot || 'a11-lm')
      : (marsStage
        ? (focusSiteId && SITE_FOCUS[focusSiteId]?.body === 'mars' ? focusSiteId : (sample.hotspot || 'opportunity'))
        : ((f === 'moon' || f === 'dive') ? moonHotDefault : (sample.hotspot || null)))
    if (hotspotRef) {
      hotspotRef.current = ab > 0.4 || (marsStage && marsLock) ? hot : null
    }
    const focus = hot ? SITE_FOCUS[hot] : null
    if (moonAimRef) {
      if (atlasLock) {
        // Aim follows an explicit user choice (limb reveal / dossier) — not hover chase
        const entry = SITE_FOCUS[focusSiteId || 'a11-lm']
        if (entry?.body === 'moon') atlasAimLon.current = entry.aimLon
        else if (atlasAimLon.current == null) atlasAimLon.current = SITE_FOCUS['a11-lm'].aimLon
        moonAimRef.current = atlasAimLon.current
      } else {
        atlasAimLon.current = null
        // Keep the active Moon leftover front-facing from Arrival onward (no free-spin limb)
        const moonSiteId = (
          (focus?.body === 'moon' && hot)
          || (f === 'moon' || f === 'dive' ? moonHotDefault : null)
        )
        const entry = moonSiteId ? SITE_FOCUS[moonSiteId] : null
        moonAimRef.current = entry?.body === 'moon' ? entry.aimLon : null
      }
    }
    if (marsAimRef) {
      if (marsStage && marsLock) {
        if (marsAimLon.current == null) {
          const entry = SITE_FOCUS[focusSiteId || 'opportunity']
          marsAimLon.current = entry?.body === 'mars'
            ? entry.aimLon
            : SITE_FOCUS.opportunity.aimLon
        }
        // Wheel / focusSiteId may retarget — update locked aim when site is mars
        const entry = SITE_FOCUS[focusSiteId]
        if (entry?.body === 'mars') marsAimLon.current = entry.aimLon
        marsAimRef.current = marsAimLon.current
      } else {
        marsAimLon.current = null
        marsAimRef.current = !atlasLock && marsStage && focus?.body === 'mars'
          ? focus.aimLon
          : null
      }
    }

    const targetDpr = clamp(
      (window.devicePixelRatio || 1) * (sample.event.storm > 0.45 || sample.event.dive > 0.55 ? 0.72 : 1),
      1,
      reduced ? 1.2 : 1.7,
    )
    if (Math.abs(targetDpr - lastDpr.current) > 0.08) {
      gl.setPixelRatio(targetDpr)
      lastDpr.current = targetDpr
    }

    // Moon acts: hard-lock X to center — parallax was shifting the disc right/left
    // Transit early frames stay centered on the lunar zoom before the corridor opens
    const moonLock = f === 'moon' || f === 'dive' || ab > 0.02 || (transit && journey.moonExit < 0.28)
    const mx = moonLock ? 0 : inertia.current.x * (0.1 + sample.event.warp * 0.08)
    const my = moonLock ? 0 : inertia.current.y * (0.06 + sample.event.warp * 0.05)

    // Locked Meridiani stage (Image 2): right-hemisphere Mars, room for the arc wheel
    const marsStageLock = marsLock && marsStage
    const lookBaseX = moonLock ? 0 : sample.look[0] + mx * 0.04
    // Look left of Mars center so ~50% of the body stays in frame
    const lookHemiX = marsStageLock
      ? 1.28
      : marsStage
        ? lerp(sample.look[0], 1.28, hemi)
        : lookBaseX

    // Portrait / narrow viewports crush horizontal FOV — without a Z pullback the
    // Moon overfills the frame (dark_frac≈0) and reads as a flat crater photo.
    const lunarBreathing = (f === 'moon' || f === 'dive') && !marsStageLock
    const aspect = Math.max(0.35, Math.min(2.4, size?.width && size?.height ? size.width / size.height : 1))
    const narrow = aspect < 0.72 || mobile
    const moonZBoost = lunarBreathing
      ? (narrow ? lerp(1.55, 2.35, clamp((0.72 - aspect) / 0.37, 0, 1)) : 0.55)
      : 0

    if (marsStageLock) {
      desired.set(0.55 + mx * 0.12, 0.1 - my * 0.35, 4.7)
    } else {
      desired.set(
        moonLock ? 0 : sample.cam[0] + mx,
        sample.cam[1] - my,
        sample.cam[2] + moonZBoost,
      )
    }

    // Shot-owned damp — transit gets extra silk so planet handoff never punches
    const shotDamp = Number.isFinite(sample.damp) ? sample.damp : 0.06
    const shotFovDamp = Number.isFinite(sample.fovDamp) ? sample.fovDamp : 0.07
    const transitSilk = transit ? 0.55 : 1
    const damp = reduced
      ? Math.min(0.28, shotDamp * 2.4)
      : Math.min(0.22, shotDamp * transitSilk)
    camera.position.x = lerp(camera.position.x, desired.x, damp)
    camera.position.y = lerp(camera.position.y, desired.y, damp)
    camera.position.z = lerp(camera.position.z, desired.z, damp)

    if ('fov' in camera) {
      const lunarFovLift = lunarBreathing && narrow ? (mobile ? 7.5 : 4.5) : (lunarBreathing ? 2 : 0)
      const targetFov = marsStageLock ? 33 : sample.fov + lunarFovLift
      const fovDamp = reduced
        ? Math.min(0.28, shotFovDamp * 2.2)
        : Math.min(0.2, shotFovDamp * (transit ? 0.62 : 1))
      camera.fov = lerp(camera.fov, targetFov, fovDamp)
      camera.updateProjectionMatrix()
    }

    // Mobile silence: look hard upward so Voyager sits in clear sky above coda copy
    const lookY = marsStageLock
      ? 0.06
      : (f === 'pioneer' && mobile ? sample.look[1] + 1.72 : sample.look[1])
    look.set(
      moonLock ? 0 : (transit ? sample.look[0] : lookHemiX),
      lookY,
      marsStageLock ? -0.4 : sample.look[2],
    )
    camera.lookAt(look)

    if (moonRef.current) {
      const show = f === 'moon' || f === 'dive' || ab > 0.02 || (transit && journey.moonPresence > 0.08)
      moonRef.current.visible = (show || sample.event.dive > 0.05) && !(transit && journey.moonExit > 0.88)

      let targetScale = 0.01
      let tx = 0
      let ty = 0
      let tz = 0
      if (f === 'moon' || f === 'dive') {
        const arrival = sample.act?.id === 'hero'
        const nearPass = sample.act?.id === 'crater_dive'
        // Keep circular limbs + starfield — never let the disc become a flat fill
        const slim = mobile ? 0.82 : 0.94
        if (nearPass) {
          targetScale = lerp(1.55, 1.78, sample.event.dive) * slim
        } else {
          targetScale = (arrival ? lerp(1.38, 1.48, sample.eased) : lerp(1.46, 1.58, sample.eased)) * slim
        }
        tx = 0
        ty = 0
        tz = 0
      } else if (transit && journey.moonPresence > 0.01) {
        // Recede hard left/back — leave the corridor clear before Mars grows
        const exit = easeInOutCubic(journey.moonExit)
        targetScale = lerp(mobile ? 1.48 : 1.62, 0.02, exit)
        tx = lerp(0, -2.4, exit)
        ty = lerp(0, 0.22, exit)
        tz = lerp(0, -5.2, exit)
      }

      // Transit: snappy exit so Moon never sits under Mars
      const poseDamp = Math.min(1, (reduced ? 8 : (transit ? 5.2 : 4.2)) * step)
      moonScale.current = lerp(moonScale.current, targetScale, poseDamp)
      moonPos.current.x = lerp(moonPos.current.x, tx, poseDamp)
      moonPos.current.y = lerp(moonPos.current.y, ty, poseDamp)
      moonPos.current.z = lerp(moonPos.current.z, tz, poseDamp)
      moonRef.current.scale.setScalar(moonScale.current)
      moonRef.current.position.copy(moonPos.current)
    }
    // Mars: one continuous center→right rail (no branch snaps)
    if (marsRef.current) {
      const showMars = marsLive || (transit && journey.marsPresence > 0.02)
      marsRef.current.visible = showMars
      if (showMars) {
        // Presence fades the disc in without a scale pop
        const presence = transit
          ? clamp(journey.marsPresence, 0, 1)
          : 1
        // Enter from far-right after Moon clears — grow into Meridiani right-limb lock
        const hemiX = lerp(2.4, 3.05, slide)
        const ty = lerp(0.08, 0.04, slide)
        const tz = lerp(-2.8, -0.5, slide)
        const hemiScale = lerp(0.55, 1.82, slide) * lerp(0.55, 1, easeInOutCubic(presence))
        const poseDamp = Math.min(1, (reduced ? 5.5 : (transit ? 2.35 : 2.05)) * step)
        marsScale.current = lerp(marsScale.current, hemiScale, poseDamp)
        marsPos.current.x = lerp(marsPos.current.x, hemiX, poseDamp)
        marsPos.current.y = lerp(marsPos.current.y, ty, poseDamp)
        marsPos.current.z = lerp(marsPos.current.z, tz, poseDamp)
        marsRef.current.scale.setScalar(marsScale.current)
        marsRef.current.position.copy(marsPos.current)
      } else {
        // Soft park — keep last pose; only shrink when fully off
        marsScale.current = lerp(marsScale.current, 0.01, Math.min(1, 1.85 * step))
        marsRef.current.scale.setScalar(marsScale.current)
        if (marsScale.current < 0.02) marsRef.current.visible = false
      }
    }
    if (pioneerRef.current) {
      // Stay visible for the whole carrier→silence farewell — never hide under Atlas linger
      const show = f === 'pioneer'
      pioneerRef.current.visible = show
      // Hero craft — large enough to read as Voyager, not a silhouette speck
      const craftScale = show
        ? (mobile ? lerp(1.35, 1.65, sample.eased) : lerp(1.85, 2.45, sample.eased))
        : 0.01
      const craftX = mobile ? 0.04 : 0.42
      const craftY = mobile ? 2.35 : 0.08
      const craftZ = mobile ? -7.4 : -7.6
      pioneerRef.current.position.set(craftX, craftY, craftZ)
      pioneerRef.current.scale.setScalar(
        lerp(pioneerRef.current.scale.x || craftScale, craftScale, Math.min(1, 3.2 * step)),
      )
    }
    // Lighting lockstep with events — keep a readable sun on Voyager (pioneer)
    if (sunRef.current) {
      const pioneerSunY = f === 'pioneer' ? (mobile ? 5.2 : 3.6) : 2.5
      sunRef.current.position.set(
        marsish ? 4.0 : f === 'pioneer' ? 3.2 : 6.0,
        marsish ? 3.2 : pioneerSunY,
        f === 'pioneer' ? 4.5 : 3,
      )
      const base = sample.grade.exposure * (f === 'storm' ? 0.35 : f === 'pioneer' ? (mobile ? 2.15 : 1.85) : 1.4)
      const darkMul = f === 'pioneer' ? (1 - sample.dark * 0.35) : (1 - sample.dark * 0.92)
      const carrierMul = f === 'pioneer' ? (1 - sample.event.carrier * 0.12) : (1 - sample.event.carrier * 0.55)
      sunRef.current.intensity = base * darkMul * carrierMul
      sunRef.current.color.set(marsish ? '#ffb890' : f === 'pioneer' ? '#fff8f0' : '#fff6ea')
    }
    if (fillRef.current) {
      fillRef.current.intensity = 0.14 * (1 - sample.dark * 0.85) * (1 - sample.event.storm * 0.7)
    }
    if (sunDirRef.current) {
      sunDirRef.current.set(marsish ? 0.62 : 0.85, marsish ? 0.48 : 0.32, marsish ? 0.28 : 0.42)
    }
    if (fogRef.current) {
      // Atlas hold: keep the near-side surface readable (no haze wall)
      // Mars hemi: deep clear space — no muddy brown fog wall on the left
      const marsClear = marsLive ? lerp(1, 0.35, sample.event.storm) : 1
      fogRef.current.near = lerp(sample.fog[0] * marsClear, 22, ab)
      fogRef.current.far = lerp(Math.max(sample.fog[1], marsLive ? 55 : sample.fog[1]), 90, ab)
      const fogCol = marsish
        ? new THREE.Color().setRGB(
          0.035 + sample.event.storm * 0.08,
          0.018 + sample.event.storm * 0.02,
          0.012,
        )
        : new THREE.Color().setRGB(0.01, 0.01, 0.025)
      fogRef.current.color.copy(fogCol)
      scene.background = marsLive
        ? new THREE.Color().setRGB(0.012, 0.01, 0.014)
        : fogCol.clone().multiplyScalar(0.35 + sample.dark * 0.4)
    }

    gl.toneMappingExposure = lerp(gl.toneMappingExposure, sample.grade.exposure * (1 - sample.dark * 0.35), 0.1)
    void dt
  })

  return null
}

/** Keep post FX from taking down the whole Continuum if the composer fails. */
class ContinuumFxGate extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.warn('[SilentFleet] Continuum FX disabled', err?.message || err) }
  render() { return this.state.failed ? null : this.props.children }
}

function ContinuumPost({ mobile, reduced, stormRef, diveRef, darkRef }) {
  const [aberration] = useState(() => new Vector2(0.00004, 0.00005))
  const noiseRef = useRef(null)
  const vignetteRef = useRef(null)
  useFrame(() => {
    // Aberration / grain / vignette owned by film events — death collapses the image
    const storm = stormRef?.current ?? 0
    const dive = diveRef?.current ?? 0
    const dark = darkRef?.current ?? 0
    const w = Math.max(storm, dive) * 0.85
    aberration.set(0.00004 + w * 0.0014 + dark * 0.0004, 0.00005 + w * 0.0011 + dark * 0.00035)
    if (noiseRef.current) {
      noiseRef.current.opacity = 0.025 + storm * 0.14 + dark * 0.1
    }
    if (vignetteRef.current) {
      vignetteRef.current.offset = 0.28 + storm * 0.22 + dark * 0.12
      vignetteRef.current.darkness = 0.48 + storm * 0.42 + dark * 0.28
    }
  })
  // Mobile: cheap grade only (vignette + soft noise) so silence/storm still read cinematic
  if (reduced) return null
  if (mobile) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Noise ref={noiseRef} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />
        <Vignette ref={vignetteRef} eskil={false} offset={0.32} darkness={0.52} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* Visible but restrained bloom — was nearly invisible at 0.028 */}
      <Bloom intensity={0.085} luminanceThreshold={0.92} luminanceSmoothing={0.18} mipmapBlur={false} />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={aberration} />
      <Noise ref={noiseRef} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />
      <Vignette ref={vignetteRef} eskil={false} offset={0.28} darkness={0.48} />
    </EffectComposer>
  )
}

function ContinuumScene({
  progress,
  mouse,
  mobile,
  reduced,
  onSample,
  onMoonReady,
  onMarsActive,
  atlasLock = false,
  marsLock = false,
  focusSiteId = null,
  moonHotspotsInteractive = false,
  marsHotspotsInteractive = false,
  cardSiteId = null,
  onHotspotHover,
  onHotspotLeave,
  onHotspotOpen,
  onHotspotReveal,
  onPlanetDraggingChange,
}) {
  const moonRef = useRef()
  const marsRef = useRef()
  const pioneerRef = useRef()
  const sunRef = useRef()
  const fillRef = useRef()
  const fogRef = useRef()
  const gradeRef = useRef({ lift: [0.02, 0.03, 0.05], gain: [1, 1, 1], exposure: 1, grain: 0.04 })
  const diveRef = useRef(0)
  const stormRef = useRef(0)
  const carrierRef = useRef(0)
  const warpRef = useRef(0)
  const darkRef = useRef(0)
  const sunDirRef = useRef(new THREE.Vector3(0.85, 0.32, 0.42))
  const hotspotRef = useRef(null)
  const moonAimRef = useRef(null)
  const marsAimRef = useRef(null)
  const beaconsVisibleRef = useRef(0)
  const marsBeaconsVisibleRef = useRef(0)
  const moonDrag = usePlanetYawDrag(atlasLock, reduced, onPlanetDraggingChange)
  const marsDrag = usePlanetYawDrag(marsLock && !atlasLock, reduced, onPlanetDraggingChange)

  const revealMoonSite = useCallback((site) => {
    moonDrag.reset()
    onHotspotReveal?.(site)
  }, [moonDrag, onHotspotReveal])

  const revealMarsSite = useCallback((site) => {
    marsDrag.reset()
    onHotspotReveal?.(site)
  }, [marsDrag, onHotspotReveal])
  // Cap at 4K — dual 8K uploads were blowing WebGL memory on some GPUs
  const moonColor = mobile ? '/textures/moon_color_2k.jpg' : '/textures/moon_color_4k.jpg'
  const moonHeight = mobile ? '/textures/moon_height_2k.jpg' : '/textures/moon_height_4k.jpg'
  const marsColor = mobile ? '/textures/mars_color_2k.jpg' : '/textures/mars_color_4k.jpg'
  const marsHeight = mobile ? '/textures/mars_bump_2k.jpg' : '/textures/mars_bump_4k.jpg'

  return (
    <>
      <color attach="background" args={['#020206']} />
      <fog ref={fogRef} attach="fog" args={['#020206', 14, 72]} />
      <ambientLight intensity={0.055} />
      <directionalLight ref={sunRef} position={[6, 2.5, 3]} intensity={1.4} color="#fff6ea" />
      <directionalLight ref={fillRef} position={[-3, -0.5, -2]} intensity={0.14} color="#6a82ff" />

      <FilmDirector
        progress={progress}
        mouse={mouse}
        reduced={reduced}
        mobile={mobile}
        moonRef={moonRef}
        marsRef={marsRef}
        pioneerRef={pioneerRef}
        sunRef={sunRef}
        fillRef={fillRef}
        fogRef={fogRef}
        gradeRef={gradeRef}
        diveRef={diveRef}
        stormRef={stormRef}
        carrierRef={carrierRef}
        warpRef={warpRef}
        darkRef={darkRef}
        sunDirRef={sunDirRef}
        hotspotRef={hotspotRef}
        moonAimRef={moonAimRef}
        marsAimRef={marsAimRef}
        beaconsVisibleRef={beaconsVisibleRef}
        marsBeaconsVisibleRef={marsBeaconsVisibleRef}
        onSample={onSample}
        onMarsActive={onMarsActive}
        atlasLock={atlasLock}
        marsLock={marsLock}
        focusSiteId={focusSiteId}
      />

      <Starfield count={mobile ? 1800 : 3200} warpRef={warpRef} darkRef={darkRef} />
      {/* Dust only during deep storm smother — never the muddy Meridiani polygon sheets */}
      {!mobile && <DustField count={700} stormRef={stormRef} />}

      {/* Moon Suspense is separate so Mars 8K never blocks hero readiness */}
      <Suspense fallback={null}>
        <BodySphere
          groupRef={moonRef}
          body={0}
          rim="#9ecfff"
          mobile={mobile}
          colorPath={moonColor}
          heightPath={moonHeight}
          gradeRef={gradeRef}
          stormRef={stormRef}
          darkRef={darkRef}
          sunDirRef={sunDirRef}
          sites={MOON_SITES}
          hotspotRef={hotspotRef}
          aimLonRef={moonAimRef}
          yawOffsetRef={moonDrag.yaw}
          beaconsVisibleRef={beaconsVisibleRef}
          hotspotsInteractive={moonHotspotsInteractive}
          cardSiteId={cardSiteId}
          onHotspotHover={onHotspotHover}
          onHotspotLeave={onHotspotLeave}
          onHotspotOpen={onHotspotOpen}
          onHotspotReveal={revealMoonSite}
        />
        <MoonReadySignal onReady={onMoonReady} />
      </Suspense>
      <Suspense fallback={null}>
        <BodySphere
          groupRef={marsRef}
          body={1}
          rim="#ff9a6a"
          mobile={mobile}
          spin={0.02}
          colorPath={marsColor}
          heightPath={marsHeight}
          gradeRef={gradeRef}
          stormRef={stormRef}
          darkRef={darkRef}
          sunDirRef={sunDirRef}
          sites={MARS_SITES}
          hotspotRef={hotspotRef}
          aimLonRef={marsAimRef}
          yawOffsetRef={marsDrag.yaw}
          beaconsVisibleRef={marsBeaconsVisibleRef}
          hotspotsInteractive={marsHotspotsInteractive}
          cardSiteId={cardSiteId}
          onHotspotHover={onHotspotHover}
          onHotspotLeave={onHotspotLeave}
          onHotspotOpen={onHotspotOpen}
          onHotspotReveal={revealMarsSite}
        />
      </Suspense>

      <Suspense fallback={null}>
        <VoyagerCraft groupRef={pioneerRef} carrierRef={carrierRef} />
      </Suspense>
      <ContinuumFxGate>
        <ContinuumPost mobile={mobile} reduced={reduced} stormRef={stormRef} diveRef={diveRef} darkRef={darkRef} />
      </ContinuumFxGate>
    </>
  )
}

function MoonReadySignal({ onReady }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

export default function ContinuumCanvas({
  progress,
  mouse,
  mobile,
  reduced,
  active = true,
  onSample,
  onMoonReady,
  onMarsActive,
  atlasLock = false,
  marsLock = false,
  focusSiteId = null,
  moonHotspotsInteractive = false,
  marsHotspotsInteractive = false,
  cardSiteId = null,
  onHotspotHover,
  onHotspotLeave,
  onHotspotOpen,
  onHotspotReveal,
}) {
  // Keep rendering during boot so textures upload + FilmDirector places the Moon
  // behind the preloader. Demand mode for reduced-motion + when the tab is hidden.
  void active
  const rootRef = useRef(null)
  const [pageVisible, setPageVisible] = useState(
    () => (typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'),
  )
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Fade Continuum only when Fleet/Recover enters — never during Silence (Voyager farewell).
  // Tying exit to #journey bottom killed Voyager mid-coda as the rail tip hit 1.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window === 'undefined') return undefined
    gsap.set(root, { y: 0, opacity: 1, force3D: true })
    const yTo = gsap.quickTo(root, 'y', { duration: 0.18, ease: 'power2.out' })
    const oTo = gsap.quickTo(root, 'opacity', { duration: 0.22, ease: 'power2.out' })
    let lastExit = 1
    const apply = () => {
      const silenceLive = !!document.querySelector('.journey-spacer.is-silence-live')
      const fleet = document.getElementById('fleet')
      const vh = window.innerHeight || 1
      if (silenceLive || !fleet) {
        if (lastExit !== 0) {
          lastExit = 0
          yTo(0)
          oTo(1)
          root.classList.remove('is-scroll-exit')
        }
        return
      }
      // Start exit once Fleet approaches mid-viewport
      const fleetTop = fleet.getBoundingClientRect().top
      const exit = gsap.utils.clamp(-vh * 1.15, 0, fleetTop - vh * 0.58)
      if (Math.abs(exit - lastExit) < 0.35) return
      lastExit = exit
      if (exit >= -0.5) {
        yTo(0)
        oTo(1)
        root.classList.remove('is-scroll-exit')
        return
      }
      root.classList.add('is-scroll-exit')
      yTo(exit)
      oTo(gsap.utils.clamp(0, 1, 1 + exit / (vh * 0.92)))
    }
    apply()
    gsap.ticker.add(apply)
    window.addEventListener('resize', apply, { passive: true })
    return () => {
      gsap.ticker.remove(apply)
      window.removeEventListener('resize', apply)
      gsap.set(root, { clearProps: 'transform,opacity' })
      root.classList.remove('is-scroll-exit')
    }
  }, [])

  const frameloop = reduced || !pageVisible ? 'demand' : 'always'
  const [planetDragging, setPlanetDragging] = useState(false)
  const onPlanetDraggingChange = useCallback((on) => {
    setPlanetDragging(!!on)
  }, [])

  const anyHotspots = moonHotspotsInteractive || marsHotspotsInteractive
  const anyDrag = atlasLock || marsLock

  return (
    <div
      ref={rootRef}
      className={[
        'continuum-canvas',
        anyHotspots ? 'is-hotspots' : '',
        anyDrag ? 'is-atlas-drag' : '',
        planetDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden={!anyHotspots}
    >
      <Canvas
        dpr={mobile ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 0.02, 6.8], fov: 36, near: 0.04, far: 220 }}
        gl={{
          antialias: !mobile,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
        }}
        frameloop={frameloop}
        onCreated={({ gl }) => {
          gl.setClearColor('#020206')
          gl.toneMapping = THREE.ACESFilmicToneMapping
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            console.warn('[SilentFleet] WebGL context lost')
          }, false)
          canvas.addEventListener('webglcontextrestored', () => {
            gl.setClearColor('#020206')
            gl.setSize(canvas.clientWidth, canvas.clientHeight, false)
          }, false)
        }}
      >
        <ContinuumScene
          progress={progress}
          mouse={mouse}
          mobile={mobile}
          reduced={reduced}
          onSample={onSample}
          onMoonReady={onMoonReady}
          onMarsActive={onMarsActive}
          atlasLock={atlasLock}
          marsLock={marsLock}
          focusSiteId={focusSiteId}
          moonHotspotsInteractive={moonHotspotsInteractive}
          marsHotspotsInteractive={marsHotspotsInteractive}
          cardSiteId={cardSiteId}
          onHotspotHover={onHotspotHover}
          onHotspotLeave={onHotspotLeave}
          onHotspotOpen={onHotspotOpen}
          onHotspotReveal={onHotspotReveal}
          onPlanetDraggingChange={onPlanetDraggingChange}
        />
      </Canvas>
    </div>
  )
}

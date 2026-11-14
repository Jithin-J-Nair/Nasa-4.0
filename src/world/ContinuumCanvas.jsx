/* eslint-disable react/no-unknown-property */
/**
 * ContinuumCanvas — diegetic scene events, not overlay stickers.
 * Crater you enter · Meridiani dust as place · carrier death as physics.
 * Material system: albedo + height AO/roughness + GGX + ASC-CDL grade.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import * as THREE from 'three'
import { sampleActs, lerp, clamp } from './film'
import { ATLAS_HOLD_PROGRESS, latLonToLocal, SITE_FOCUS } from './geo'
import { ARTIFACTS } from '../data/artifacts'

const MOON_SITES = ARTIFACTS.filter((a) => a.body === 'moon' && Number.isFinite(a.lat) && Number.isFinite(a.lon))
const MARS_SITES = ARTIFACTS.filter((a) => a.body === 'mars' && Number.isFinite(a.lat) && Number.isFinite(a.lon))

/** Atlas-only: click-hold drag rotates the Moon on Y. Stays centered; default yaw = 0 (site facing). */
const ATLAS_DRAG_SLOP = 8

function useAtlasMoonDrag(atlasLock, reduced, onDraggingChange) {
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
    if (!atlasLock || reduced) {
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
        if (Math.abs(ax) < ATLAS_DRAG_SLOP && Math.abs(ay) < ATLAS_DRAG_SLOP) return
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
      // Drag left → surface moves left (right-to-left spin); drag right → left-to-right
      const radPerPx = (Math.PI * 1.25) / Math.max(1, size.width)
      targetYaw.current += dx * radPerPx
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', clearDrag)
    el.addEventListener('pointercancel', clearDrag)
    el.addEventListener('lostpointercapture', clearDrag)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', clearDrag)
      el.removeEventListener('pointercancel', clearDrag)
      el.removeEventListener('lostpointercapture', clearDrag)
      dragging.current = false
      pending.current = false
      activePointer.current = null
      onDraggingChange?.(false)
    }
  }, [atlasLock, reduced, gl, size.width, onDraggingChange])

  useFrame((_, dt) => {
    const step = Math.min(0.05, Math.max(0.001, dt))
    if (!atlasLock) {
      // Leave Atlas → ease back to default facing (offset 0)
      targetYaw.current = lerp(targetYaw.current, 0, Math.min(1, 3.5 * step))
    }
    yaw.current = lerp(yaw.current, targetYaw.current, Math.min(1, (dragging.current ? 22 : 12) * step))
  })

  return yaw
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
  p *= 1.0 + uWarp * 0.4;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float tw = 0.55 + 0.45*sin(uTime*(0.5+aSeed*2.0)+aSeed*12.0);
  vAlpha = tw * (1.0 - uWarp * 0.45) * (1.0 - uDark * 0.75);
  gl_PointSize = aSize * uPixelRatio * (190.0 / -mv.z) * (0.65 + 0.35*tw) * (1.0 + uWarp * 2.0);
  gl_Position = projectionMatrix * mv;
}
`
const STAR_FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if(a < 0.02) discard;
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

/* Crater bowl — geometry you enter */
const CRATER_VERT = `
uniform float uDepth;
varying vec2 vUv;
varying float vDepth;
varying vec3 vWorld;
void main(){
  vUv = uv;
  vec3 p = position;
  float r = length(uv - 0.5) * 2.0;
  float bowl = pow(smoothstep(0.0, 1.0, r), 1.6);
  p.z -= (1.0 - bowl) * uDepth;
  // rim lip
  p.z += smoothstep(0.72, 0.92, r) * (1.0 - smoothstep(0.92, 1.05, r)) * uDepth * 0.22;
  vDepth = 1.0 - bowl;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`
const CRATER_FRAG = `
uniform float uDive;
uniform float uDark;
uniform float uTime;
uniform vec3 uSunDir;
varying vec2 vUv;
varying float vDepth;
varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float n = hash(vUv * 40.0 + uTime * 0.01);
  vec3 regolith = vec3(0.38, 0.36, 0.34) * (0.85 + 0.15 * n);
  regolith *= mix(0.35, 1.0, vDepth * 0.5 + 0.5);
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float lit = max(dot(N, normalize(uSunDir)), 0.0);
  vec3 col = regolith * (0.15 + lit * 0.85);
  col *= 1.0 - uDark * 0.6;
  float a = smoothstep(1.05, 0.55, r) * clamp(uDive * 1.4, 0.0, 1.0);
  if (a < 0.02) discard;
  // floor darkness at dive peak
  col *= mix(1.0, 0.25, vDepth * uDive);
  gl_FragColor = vec4(col, a);
}
`

/* Carrier signal beam — physics of dying ping */
const BEAM_VERT = `
varying float vY;
void main(){
  vY = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const BEAM_FRAG = `
uniform float uCarrier;
uniform float uTime;
varying float vY;
void main(){
  float pulse = 0.55 + 0.45 * sin(uTime * 4.0 - vY * 18.0);
  float life = 1.0 - uCarrier;
  float a = life * pulse * smoothstep(0.0, 0.1, vY) * smoothstep(1.0, 0.7, vY) * 0.55;
  if (a < 0.01) discard;
  vec3 col = mix(vec3(0.55, 0.75, 1.0), vec3(0.2, 0.25, 0.35), uCarrier);
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
  gl_PointSize = aSize * uPixelRatio * (110.0 / -mv.z) * (0.45 + uStorm);
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
      size[i] = 0.28 + Math.random() * 1.7
      seed[i] = Math.random()
      const warm = Math.random() > 0.9
      col[i * 3] = warm ? 1 : 0.8 + Math.random() * 0.2
      col[i * 3 + 1] = warm ? 0.86 : 0.88 + Math.random() * 0.12
      col[i * 3 + 2] = warm ? 0.6 : 1
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
      size[i] = 0.7 + Math.random() * 3.2
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
    if (pts.current) pts.current.visible = storm > 0.04
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
    if (group.current) group.current.visible = storm > 0.05
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

function CraterBowl({ diveRef, darkRef, sunDirRef, groupRef }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: CRATER_VERT,
    fragmentShader: CRATER_FRAG,
    uniforms: {
      uDepth: { value: 0.55 },
      uDive: { value: 0 },
      uDark: { value: 0 },
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.85, 0.32, 0.42) },
    },
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  }), [])

  useFrame((s) => {
    const dive = diveRef?.current ?? 0
    mat.uniforms.uDive.value = dive
    mat.uniforms.uDark.value = darkRef?.current ?? 0
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uDepth.value = 0.35 + dive * 0.85
    if (sunDirRef?.current) mat.uniforms.uSunDir.value.copy(sunDirRef.current)
    if (groupRef?.current) groupRef.current.visible = dive > 0.08
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh rotation={[-Math.PI / 2.15, 0.1, 0.2]} position={[0.08, -0.15, 0.35]} scale={[1.4, 1.4, 1.4]}>
        <planeGeometry args={[2.4, 2.4, 64, 64]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* ejecta particles rush toward camera during dive */}
      <EjectaBurst diveRef={diveRef} />
    </group>
  )
}

function EjectaBurst({ diveRef }) {
  const count = 420
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 1.2
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.4
      pos[i * 3 + 2] = Math.sin(a) * r
      seed[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [])

  const mat = useMemo(() => new THREE.PointsMaterial({
    color: '#8a8680',
    size: 0.035,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  }), [])

  const ref = useRef()
  useFrame((s) => {
    const dive = diveRef?.current ?? 0
    mat.opacity = dive * 0.7
    if (ref.current) {
      ref.current.visible = dive > 0.12
      ref.current.scale.setScalar(1 + dive * 2.8)
      ref.current.rotation.z = s.clock.elapsedTime * 0.4 * dive
    }
  })
  return <points ref={ref} geometry={geo} material={mat} position={[0.08, -0.05, 0.2]} visible={false} />
}

function SignalBeam({ carrierRef, activeRef, groupRef }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    uniforms: {
      uCarrier: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), [])

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    const c = carrierRef?.current ?? 0
    mat.uniforms.uCarrier.value = c
    if (groupRef?.current) {
      const show = !!activeRef?.current && c < 0.98
      groupRef.current.visible = show
      if (show) groupRef.current.scale.set(1, lerp(2.8, 0.4, c), 1)
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.08, -9]} visible={false}>
      <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.55, 4.5, 16, 1, true]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </group>
  )
}

function SiteBeacon({
  site,
  hotspotRef,
  color = '#8ec8ff',
  interactive = false,
  visibleRef,
  cardOpen = false,
  onHover,
  onLeave,
  onOpen,
}) {
  const ref = useRef()
  const groupRef = useRef()
  const uiRef = useRef()
  const pos = useMemo(() => latLonToLocal(site.lat, site.lon, 1.012), [site.lat, site.lon])
  useFrame((s) => {
    if (!ref.current || !groupRef.current) return
    // Hero / film: beacons stay off. Atlas blend reveals them.
    const show = (visibleRef?.current ?? 0) > 0.42 && interactive
    groupRef.current.visible = show
    if (uiRef.current) {
      uiRef.current.style.opacity = show ? '1' : '0'
      uiRef.current.style.pointerEvents = show ? 'auto' : 'none'
      uiRef.current.style.visibility = show ? 'visible' : 'hidden'
    }
    if (!show) return
    const active = hotspotRef?.current === site.id || cardOpen
    const pulse = active ? 0.5 + Math.sin(s.clock.elapsedTime * 3.6) * 0.22 : 0.28
    ref.current.scale.setScalar(active ? 1.15 + pulse * 0.2 : 0.85)
    ref.current.material.opacity = pulse
  })
  return (
    <group ref={groupRef} position={pos} visible={false}>
      <mesh ref={ref} renderOrder={2}>
        <sphereGeometry args={[0.0075, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </mesh>
      {interactive && (
        <Html
          center
          distanceFactor={2.4}
          zIndexRange={[40, 0]}
          style={{ pointerEvents: 'none' }}
          occlude={false}
        >
          <div className="moon-hotspot" ref={uiRef} style={{ opacity: 0, visibility: 'hidden' }}>
            <button
              type="button"
              className={`moon-hotspot-hit ${cardOpen ? 'on' : ''}`}
              aria-label={`${site.name} at ${site.coords}`}
              onMouseEnter={() => onHover?.(site)}
              onFocus={() => onHover?.(site)}
              onMouseLeave={() => onLeave?.(site)}
              onBlur={() => onLeave?.(site)}
              onClick={() => onOpen?.(site)}
            />
            {cardOpen && (
              <article className="moon-hotspot-card" role="dialog" aria-label={site.name}>
                {site.image && (
                  <div className={`nasa-media body-${site.body}`}>
                    <img src={site.image} alt={site.imageAlt || site.name} loading="lazy" decoding="async" />
                    <span className="credit">{site.credit}</span>
                  </div>
                )}
                <p className="kicker">{site.mission} · {site.status}</p>
                <h3>{site.name}</h3>
                <p className="mono coords">{site.coords}</p>
                <p className="blurb">{site.science}</p>
                <span className="mono open">OPEN DOSSIER →</span>
              </article>
            )}
          </div>
        </Html>
      )}
    </group>
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
    uHeightScale: { value: isMars ? 0.010 : 0.0055 },
    uBump: { value: isMars ? 2.05 : 1.45 },
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
      uIntensity: { value: isMars ? 0.55 : 0.42 },
      uPower: { value: isMars ? 3.2 : 4.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  }), [rim, isMars])

  // −π/2 puts lon 0 on +Z after SphereGeometry UV; aimLon rotates that meridian to camera
  const baseYaw = -Math.PI / 2
  const yawSmooth = useRef(baseYaw)
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
        // Shortest-path ease to face the hotspot — never jump via absolute freeSpin time
        const target = baseYaw - (aim * Math.PI) / 180
        let delta = target - yawSmooth.current
        while (delta > Math.PI) delta -= Math.PI * 2
        while (delta < -Math.PI) delta += Math.PI * 2
        yawSmooth.current += delta * Math.min(1, 2.4 * step)
      } else {
        // Gentle continuous spin (~0.02 rad/s) — same feel as the locked hero tip
        yawSmooth.current += spin * spinMul * step
      }
      // Atlas user drag is additive yaw on top of the locked site facing
      const userYaw = yawOffsetRef?.current ?? 0
      mesh.current.rotation.y = yawSmooth.current + userYaw
    }
  })

  const segs = mobile ? 96 : 192
  const beaconColor = isMars ? '#ff7a45' : '#8ec8ff'
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
        {!mobile && sites.map((site) => (
          <SiteBeacon
            key={site.id}
            site={site}
            hotspotRef={hotspotRef}
            color={beaconColor}
            interactive={hotspotsInteractive}
            visibleRef={beaconsVisibleRef}
            cardOpen={cardSiteId === site.id}
            onHover={onHotspotHover}
            onLeave={onHotspotLeave}
            onOpen={onHotspotOpen}
          />
        ))}
      </group>
      {/* Mars only — Moon has no atmosphere; the Fresnel shell read as a grey-blue rim */}
      {isMars && (
        <mesh scale={1.055}>
          <sphereGeometry args={[1, 48, 48]} />
          <primitive object={atmoMat} attach="material" />
        </mesh>
      )}
    </group>
  )
}

function PioneerProbe({ groupRef, carrierRef }) {
  const inner = useRef()
  const rings = useRef([])
  const plaque = useRef()
  useFrame((s) => {
    const die = carrierRef?.current ?? 0
    if (inner.current) {
      inner.current.rotation.y = s.clock.elapsedTime * 0.07 * (1 - die * 0.85)
    }
    rings.current.forEach((mesh, i) => {
      if (!mesh) return
      const t = ((s.clock.elapsedTime * 0.28 + i * 0.9) % 3.2) / 3.2
      const sc = 0.35 + t * 4.2
      mesh.scale.set(sc, sc, sc)
      mesh.material.opacity = (1 - t) * 0.45 * (1 - die)
    })
    if (plaque?.current) {
      plaque.current.material.emissiveIntensity = 0.55 * (1 - die * 0.95)
    }
  })
  const dishPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      pts.push(new THREE.Vector2(t * 0.92, t * t * 0.36))
    }
    return pts
  }, [])
  return (
    <group ref={groupRef} visible={false}>
      <group ref={inner} scale={1.08}>
        <mesh rotation={[Math.PI, 0, 0]} position={[0, 0.15, 0]}>
          <latheGeometry args={[dishPoints, 48]} />
          <meshStandardMaterial color="#c2c8d2" metalness={0.92} roughness={0.22} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.48, 10]} />
          <meshStandardMaterial color="#8a9098" metalness={0.75} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.58, 0.36, 0.48]} />
          <meshStandardMaterial color="#6e7584" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh ref={plaque} position={[0.3, 0.55, 0.26]}>
          <planeGeometry args={[0.2, 0.14]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={0.55} metalness={0.95} roughness={0.18} />
        </mesh>
        {[-1, 0, 1].map((s, i) => (
          <group key={i} rotation={[0, 0, (s * Math.PI) / 3]} position={[0, 0.55, 0]}>
            <mesh position={[0.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.014, 0.014, 1.15, 8]} />
              <meshStandardMaterial color="#7a8088" metalness={0.75} roughness={0.38} />
            </mesh>
            <mesh position={[1.28, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.22, 12]} />
              <meshStandardMaterial color="#4a4038" emissive="#ff6030" emissiveIntensity={0.3} roughness={0.5} metalness={0.4} />
            </mesh>
          </group>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(el) => { rings.current[i] = el }}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, -0.35, 0]}
          >
            <torusGeometry args={[0.45, 0.007, 6, 56]} />
            <meshBasicMaterial color="#8ec8ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
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
  moonRef,
  marsRef,
  pioneerRef,
  craterRef,
  beamActiveRef,
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
  onSample,
  atlasLock = false,
  focusSiteId = null,
}) {
  const { camera, gl, scene } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const inertia = useInertiaPointer(mouse, reduced)
  const lastDpr = useRef(1)
  const atlasBlend = useRef(0)
  const filmP = useRef(0)
  const moonPos = useRef(new THREE.Vector3(0, 0, 0))
  const moonScale = useRef(1.66)
  const atlasAimLon = useRef(null)

  useFrame((state, dt) => {
    const raw = typeof progress?.get === 'function' ? progress.get() : 0
    const step = Math.min(0.05, Math.max(0.001, dt))

    // Soft Atlas presence — hold the gentle centered zoom tip
    atlasBlend.current = lerp(atlasBlend.current, atlasLock ? 1 : 0, Math.min(1, 2.6 * step))
    const ab = atlasBlend.current
    if (beaconsVisibleRef) beaconsVisibleRef.current = ab

    // Soft-hold film while Atlas is on screen — never hard-snap progress
    const filmTarget = atlasLock ? ATLAS_HOLD_PROGRESS : raw
    filmP.current = lerp(filmP.current, filmTarget, Math.min(1, (atlasLock ? 2.2 : 4.2) * step))
    const sample = sampleActs(filmP.current)
    onSample?.(sample)

    // Atlas soft-hold sits near the dive act edge — zero diegetic events so crater/dust stay gone
    const eventMute = atlasLock ? 0 : 1
    diveRef.current = sample.event.dive * eventMute
    stormRef.current = sample.event.storm * eventMute
    carrierRef.current = sample.event.carrier * eventMute
    warpRef.current = sample.event.warp * (atlasLock ? 0.15 : 1)
    darkRef.current = atlasLock ? sample.dark * 0.15 : sample.dark
    gradeRef.current = sample.grade

    // Hero: free spin. From Objective→Atlas: ease the site onto the lens center.
    const hot = ab > 0.2
      ? (focusSiteId || sample.hotspot || 'a11-lm')
      : (sample.hotspot || null)
    if (hotspotRef) hotspotRef.current = ab > 0.4 ? hot : null
    const focus = hot ? SITE_FOCUS[hot] : null
    if (moonAimRef) {
      if (atlasLock) {
        // Freeze facing for the whole Atlas session — hover must not chase the pin
        if (atlasAimLon.current == null) {
          const entry = SITE_FOCUS[focusSiteId || 'a11-lm']
          atlasAimLon.current = entry?.body === 'moon'
            ? entry.aimLon
            : SITE_FOCUS['a11-lm'].aimLon
        }
        moonAimRef.current = atlasAimLon.current
      } else {
        atlasAimLon.current = null
        const shouldAim = focus?.body === 'moon' && (
          ab > 0.08
          || sample.act?.id === 'intimacy'
          || !!sample.hotspot
        )
        moonAimRef.current = shouldAim ? focus.aimLon : null
      }
    }
    if (marsAimRef) {
      marsAimRef.current = !atlasLock && ab > 0.2 && focus?.body === 'mars' ? focus.aimLon : null
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

    const f = sample.focus
    // Moon acts: hard-lock X to center — parallax was shifting the disc right/left
    const moonLock = f === 'moon' || f === 'dive' || ab > 0.02
    const mx = moonLock ? 0 : inertia.current.x * (0.1 + sample.event.warp * 0.08)
    const my = moonLock ? 0 : inertia.current.y * (0.06 + sample.event.warp * 0.05)

    // Single centered camera track — look stays on moon origin
    desired.set(
      moonLock ? 0 : sample.cam[0] + mx,
      sample.cam[1] - my,
      sample.cam[2],
    )

    const damp = sample.smash && ab < 0.25 ? 0.55 : (reduced ? 0.16 : 0.065)
    camera.position.x = lerp(camera.position.x, desired.x, damp)
    camera.position.y = lerp(camera.position.y, desired.y, damp)
    camera.position.z = lerp(camera.position.z, desired.z, damp)

    if ('fov' in camera) {
      camera.fov = lerp(camera.fov, sample.fov, sample.smash && ab < 0.25 ? 0.5 : 0.075)
      camera.updateProjectionMatrix()
    }

    look.set(
      moonLock ? 0 : sample.look[0] + mx * 0.04,
      sample.look[1],
      sample.look[2],
    )
    camera.lookAt(look)

    if (moonRef.current) {
      const show = f === 'moon' || f === 'dive' || ab > 0.02
      moonRef.current.visible = show || sample.event.dive > 0.05

      let targetScale = 0.01
      let tx = 0
      let ty = 0
      let tz = 0
      if (f === 'dive') {
        // Dive is later film — keep moon centered until smash pulls in
        targetScale = lerp(1.95, 5.8, sample.event.dive)
        tx = lerp(0, 0.85, sample.event.dive)
        ty = lerp(0, -0.1, sample.event.dive)
        tz = lerp(0, -0.2, sample.event.dive)
      } else if (f === 'moon') {
        const arrival = sample.act?.id === 'hero'
        // Always centered at origin — modest scale so both limbs keep equal margin
        targetScale = arrival ? lerp(1.62, 1.72, sample.eased) : lerp(1.72, 1.88, sample.eased)
        tx = 0
        ty = 0
        tz = 0
      }

      const poseDamp = Math.min(1, (reduced ? 8 : 4.5) * step)
      moonScale.current = lerp(moonScale.current, targetScale, poseDamp)
      moonPos.current.x = lerp(moonPos.current.x, tx, poseDamp)
      moonPos.current.y = lerp(moonPos.current.y, ty, poseDamp)
      moonPos.current.z = lerp(moonPos.current.z, tz, poseDamp)
      moonRef.current.scale.setScalar(moonScale.current)
      moonRef.current.position.copy(moonPos.current)
    }
    // Atlas owns the stage — kill dive crater / Mars / Pioneer bleed from film edge-blend
    const atlasClear = ab > 0.35
    if (craterRef.current) {
      const showCrater = !atlasClear && (f === 'dive' || sample.event.dive > 0.08)
      if (showCrater) {
        craterRef.current.visible = true
        craterRef.current.position.set(0.9, -0.18, 0.65)
        craterRef.current.scale.setScalar(lerp(0.9, 2.6, sample.event.dive))
      } else {
        craterRef.current.visible = false
      }
    }
    if (marsRef.current) {
      const show = !atlasClear && (f === 'mars' || f === 'storm')
      marsRef.current.visible = show
      if (show) {
        marsRef.current.position.set(2.72, 0.12, -0.45)
        // Storm: push into Meridiani — place, not overlay
        const stormPush = f === 'storm' ? sample.event.storm : 0
        marsRef.current.scale.setScalar(lerp(0.95, 1.55, Math.max(sample.eased * 0.35, stormPush * 0.7)))
      } else {
        marsRef.current.scale.setScalar(0.01)
      }
    }
    if (pioneerRef.current) {
      const show = !atlasClear && f === 'pioneer'
      pioneerRef.current.visible = show
      pioneerRef.current.position.set(0, 0.08, -9)
      pioneerRef.current.scale.setScalar(show ? lerp(0.85, 1.35, sample.eased) : 0.01)
    }
    if (beamActiveRef) beamActiveRef.current = !atlasClear && f === 'pioneer'

    // Lighting lockstep with events
    const marsish = f === 'mars' || f === 'storm'
    if (sunRef.current) {
      sunRef.current.position.set(marsish ? 4.0 : 6.0, marsish ? 3.2 : 2.5, 3)
      const base = sample.grade.exposure * (f === 'storm' ? 0.35 : 1.4)
      sunRef.current.intensity = base * (1 - sample.dark * 0.92) * (1 - sample.event.carrier * 0.55)
      sunRef.current.color.set(marsish ? '#ffb890' : '#fff6ea')
    }
    if (fillRef.current) {
      fillRef.current.intensity = 0.14 * (1 - sample.dark * 0.85) * (1 - sample.event.storm * 0.7)
    }
    if (sunDirRef.current) {
      sunDirRef.current.set(marsish ? 0.62 : 0.85, marsish ? 0.48 : 0.32, marsish ? 0.28 : 0.42)
    }
    if (fogRef.current) {
      // Atlas hold: keep the near-side surface readable (no haze wall)
      fogRef.current.near = lerp(sample.fog[0], 22, ab)
      fogRef.current.far = lerp(sample.fog[1], 90, ab)
      const fogCol = marsish
        ? new THREE.Color().setRGB(0.12 + sample.event.storm * 0.15, 0.05, 0.02)
        : new THREE.Color().setRGB(0.01, 0.01, 0.025)
      fogRef.current.color.copy(fogCol)
      scene.background = fogCol.clone().multiplyScalar(0.35 + sample.dark * 0.4)
    }

    gl.toneMappingExposure = lerp(gl.toneMappingExposure, sample.grade.exposure * (1 - sample.dark * 0.35), 0.1)
    void dt
  })

  return null
}

function ContinuumPost({ mobile, reduced, stormRef, diveRef, darkRef }) {
  const [aberration] = useState(() => new Vector2(0.00004, 0.00005))
  useFrame(() => {
    // Aberration only during owned events — never invent concentric ring artifacts on hero
    const w = Math.max(stormRef?.current ?? 0, diveRef?.current ?? 0) * 0.85
    aberration.set(0.00004 + w * 0.0011, 0.00005 + w * 0.0009)
    void darkRef
  })
  if (mobile || reduced) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.055} luminanceThreshold={0.96} luminanceSmoothing={0.25} mipmapBlur />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={aberration} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.03} />
      <Vignette eskil={false} offset={0.28} darkness={0.48} />
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
  atlasLock = false,
  focusSiteId = null,
  hotspotsInteractive = false,
  cardSiteId = null,
  onHotspotHover,
  onHotspotLeave,
  onHotspotOpen,
  onAtlasDraggingChange,
}) {
  const moonRef = useRef()
  const marsRef = useRef()
  const pioneerRef = useRef()
  const craterRef = useRef()
  const beamRef = useRef()
  const beamActiveRef = useRef(false)
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
  const atlasYawRef = useAtlasMoonDrag(atlasLock, reduced, onAtlasDraggingChange)
  // Full masters — bytes warmed during preloader (see preloadTextures.js)
  const moonColor = mobile ? '/textures/moon_color_2k.jpg' : '/textures/moon_color_8k.jpg'
  const moonHeight = mobile ? '/textures/moon_height_2k.jpg' : '/textures/moon_height_4k.jpg'
  const marsColor = mobile ? '/textures/mars_color_2k.jpg' : '/textures/mars_color_8k.jpg'
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
        moonRef={moonRef}
        marsRef={marsRef}
        pioneerRef={pioneerRef}
        craterRef={craterRef}
        beamActiveRef={beamActiveRef}
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
        onSample={onSample}
        atlasLock={atlasLock}
        focusSiteId={focusSiteId}
      />

      <Starfield count={mobile ? 2800 : 5600} warpRef={warpRef} darkRef={darkRef} />
      {!mobile && <DustField count={1200} stormRef={stormRef} />}
      {!mobile && <DustSheets stormRef={stormRef} darkRef={darkRef} sunDirRef={sunDirRef} />}

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
          yawOffsetRef={atlasYawRef}
          beaconsVisibleRef={beaconsVisibleRef}
          hotspotsInteractive={hotspotsInteractive}
          cardSiteId={cardSiteId}
          onHotspotHover={onHotspotHover}
          onHotspotLeave={onHotspotLeave}
          onHotspotOpen={onHotspotOpen}
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
        />
      </Suspense>

      <CraterBowl diveRef={diveRef} darkRef={darkRef} sunDirRef={sunDirRef} groupRef={craterRef} />
      <PioneerProbe groupRef={pioneerRef} carrierRef={carrierRef} />
      <SignalBeam carrierRef={carrierRef} activeRef={beamActiveRef} groupRef={beamRef} />
      <ContinuumPost mobile={mobile} reduced={reduced} stormRef={stormRef} diveRef={diveRef} darkRef={darkRef} />
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
  atlasLock = false,
  focusSiteId = null,
  hotspotsInteractive = false,
  cardSiteId = null,
  onHotspotHover,
  onHotspotLeave,
  onHotspotOpen,
}) {
  // Keep rendering during boot so textures upload + FilmDirector places the Moon
  // behind the preloader. Demand mode for reduced-motion + when the tab is hidden.
  void active
  const [pageVisible, setPageVisible] = useState(
    () => (typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'),
  )
  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  const frameloop = reduced || !pageVisible ? 'demand' : 'always'
  const [atlasDragging, setAtlasDragging] = useState(false)
  const onAtlasDraggingChange = useCallback((on) => {
    setAtlasDragging(!!on)
  }, [])

  return (
    <div
      className={[
        'continuum-canvas',
        hotspotsInteractive ? 'is-hotspots' : '',
        atlasLock ? 'is-atlas-drag' : '',
        atlasDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden={!hotspotsInteractive}
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
        }}
      >
        <ContinuumScene
          progress={progress}
          mouse={mouse}
          mobile={mobile}
          reduced={reduced}
          onSample={onSample}
          onMoonReady={onMoonReady}
          atlasLock={atlasLock}
          focusSiteId={focusSiteId}
          hotspotsInteractive={hotspotsInteractive}
          cardSiteId={cardSiteId}
          onHotspotHover={onHotspotHover}
          onHotspotLeave={onHotspotLeave}
          onHotspotOpen={onHotspotOpen}
          onAtlasDraggingChange={onAtlasDraggingChange}
        />
      </Canvas>
    </div>
  )
}

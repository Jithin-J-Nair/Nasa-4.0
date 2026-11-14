/* eslint-disable react/no-unknown-property */
/**
 * ContinuumCanvas — Silent Fleet film world.
 * Owned transitions: crater dive · dust storm · carrier lost.
 * Cinematic grade, inertia pointer, adaptive DPR.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import * as THREE from 'three'
import { sampleActs, lerp, clamp, smoothstep } from './film'

/* ─── planet: albedo + height bump + roughness/roughness from height ─── */
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
uniform sampler2D uColorMap;
uniform sampler2D uHeightMap;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
varying float vH;
void main(){
  vec3 tex = texture2D(uColorMap, vUv).rgb;
  tex = pow(max(tex, 0.0), vec3(mix(0.92, 0.94, uBody)));
  tex = (tex - 0.5) * mix(1.2, 1.1, uBody) + 0.5;
  tex = clamp(tex, 0.0, 1.0);

  float h = texture2D(uHeightMap, vUv).r;
  vec3 N = normalize(vN);
  vec3 dp1 = dFdx(vWorld);
  vec3 dp2 = dFdy(vWorld);
  vec2 duv1 = dFdx(vUv);
  vec2 duv2 = dFdy(vUv);
  vec3 T = normalize(dp1 * duv2.y - dp2 * duv1.y);
  vec3 B = normalize(-dp1 * duv2.x + dp2 * duv1.x);
  N = normalize(N - (T * dFdx(h) + B * dFdy(h)) * uBump);

  // Roughness from height — highlands matte, maria slightly tighter
  float rough = mix(0.82, 0.55, smoothstep(0.35, 0.75, h));
  rough = mix(rough, 0.95, uStorm * uBody);

  vec3 L = normalize(uSunDir);
  vec3 Lfill = normalize(vec3(-0.5, -0.12, -0.5));
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = max(dot(N, L), 0.0);
  float term = smoothstep(-0.08, 0.2, ndl);
  float night = 1.0 - term;

  vec3 albedo = tex;
  // Dust storm: choke albedo toward ochre noise
  if (uStorm > 0.01 && uBody > 0.5) {
    float n = fract(sin(dot(vUv * 40.0, vec2(12.9898,78.233)) + uTime * 3.0) * 43758.5453);
    vec3 dust = vec3(0.55, 0.28, 0.12) * (0.7 + 0.3 * n);
    albedo = mix(albedo, dust, uStorm * 0.85);
  }

  float hemi = N.y * 0.5 + 0.5;
  vec3 ambient = albedo * mix(0.04, 0.1, hemi);
  vec3 key = albedo * ndl * mix(1.2, 1.05, uBody) * mix(0.16, 1.0, term);
  vec3 fill = albedo * max(dot(N, Lfill), 0.0) * 0.12 * mix(0.3, 1.0, term);

  // Soft GGX-ish highlight (tight for low roughness)
  vec3 H = normalize(L + V);
  float nh = max(dot(N, H), 0.0);
  float specPow = mix(12.0, 48.0, 1.0 - rough);
  float spec = pow(nh, specPow) * (1.0 - rough) * 0.22 * term;

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.1);
  vec3 rim = uRim * fres * mix(0.5, 0.25, uBody) * term;
  vec3 nightGlow = mix(vec3(0.015, 0.02, 0.04), vec3(0.05, 0.015, 0.008), uBody) * night * 0.4;

  vec3 col = ambient + key + fill + rim + nightGlow + vec3(spec);
  col *= uExposure;
  // ASC-CDL style grade
  col = col * uGain + uLift;
  col = pow(max(col, 0.0), vec3(0.96));
  gl_FragColor = vec4(col, 1.0);
}
`

const STAR_VERT = `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
uniform float uWarp;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec3 p = position;
  p += vec3(sin(uTime*0.01+aSeed), cos(uTime*0.012+aSeed*2.0), sin(uTime*0.008+aSeed))*0.12;
  // Dive warp: stars streak toward camera
  p *= 1.0 + uWarp * 0.35;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float tw = 0.55 + 0.45*sin(uTime*(0.5+aSeed*2.0)+aSeed*12.0);
  vAlpha = tw * (1.0 - uWarp * 0.4);
  gl_PointSize = aSize * uPixelRatio * (190.0 / -mv.z) * (0.65 + 0.35*tw) * (1.0 + uWarp * 1.8);
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

/* Fullscreen transition plane: crater dive + dust storm + carrier veil */
const FX_VERT = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`
const FX_FRAG = `
uniform float uTime;
uniform float uDive;
uniform float uStorm;
uniform float uCarrier;
uniform vec2 uMouse;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}

void main(){
  vec2 uv = vUv;
  vec2 m = uMouse * 0.08;
  uv += m * (uDive + uStorm) * 0.5;

  // Crater dive: radial regolith rush
  vec2 c = uv - 0.5;
  float r = length(c);
  float angle = atan(c.y, c.x);
  float rush = noise(vec2(angle * 3.0, r * 14.0 - uTime * 6.0 * uDive));
  float tunnel = smoothstep(0.15, 0.85, r) * uDive;
  vec3 diveCol = vec3(0.35, 0.34, 0.32) * rush;
  diveCol += vec3(0.08, 0.09, 0.12) * (1.0 - tunnel);
  float diveA = tunnel * (0.55 + 0.45 * rush) * uDive;

  // Dust storm: ochre sheets
  float sheet = noise(uv * vec2(3.0, 8.0) + vec2(uTime * 1.8, uTime * 0.3));
  float sheet2 = noise(uv * vec2(7.0, 2.5) - vec2(uTime * 0.9, -uTime * 1.2));
  vec3 stormCol = vec3(0.62, 0.32, 0.12) * sheet + vec3(0.4, 0.18, 0.06) * sheet2;
  float stormA = uStorm * (0.35 + 0.55 * sheet * sheet2);

  // Carrier lost: expanding rings fade to void
  float ring = abs(fract(r * 2.5 - uTime * 0.15) - 0.5);
  float ringMask = smoothstep(0.08, 0.0, ring) * (1.0 - smoothstep(0.2, 0.9, r));
  vec3 carrierCol = vec3(0.55, 0.7, 1.0) * ringMask;
  float carrierA = uCarrier * ringMask * 0.35 * (1.0 - uCarrier * 0.5);

  vec3 col = diveCol * diveA + stormCol * stormA + carrierCol * carrierA;
  float a = clamp(diveA + stormA + carrierA, 0.0, 0.92);
  // Signal death: crush midtones as carrier completes
  col *= 1.0 - uCarrier * 0.45;
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
  p.x += sin(uTime * (1.2 + aSeed) + aSeed * 20.0) * 0.4 * uStorm;
  p.y += fract(uTime * 0.15 * (0.5+aSeed) + aSeed) * -2.5 * uStorm;
  p.z += cos(uTime * 0.8 + aSeed * 10.0) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vA = uStorm * (0.4 + 0.6 * fract(aSeed * 7.1));
  gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z) * (0.5 + uStorm);
  gl_Position = projectionMatrix * mv;
}
`
const DUST_FRAG = `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vA;
  if (a < 0.02) discard;
  gl_FragColor = vec4(0.7, 0.38, 0.15, a);
}
`

function Starfield({ count = 12000, warpRef }) {
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
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uWarp.value = warpRef?.current ?? 0
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

function DustField({ count = 2800, stormRef }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const size = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1
      seed[i] = Math.random()
      size[i] = 0.8 + Math.random() * 3.5
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

function TransitionFX({ diveRef, stormRef, carrierRef, mouse }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FX_VERT,
    fragmentShader: FX_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uDive: { value: 0 },
      uStorm: { value: 0 },
      uCarrier: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), [])

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uDive.value = diveRef?.current ?? 0
    mat.uniforms.uStorm.value = stormRef?.current ?? 0
    mat.uniforms.uCarrier.value = carrierRef?.current ?? 0
    if (mouse?.current) {
      mat.uniforms.uMouse.value.set(mouse.current.nx, mouse.current.ny)
    }
  })

  return (
    <mesh frustumCulled={false} renderOrder={10}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
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
  sunDirRef,
}) {
  const mesh = useRef()
  const isMars = body > 0.5
  const [colorMap, heightMap] = useTexture([colorPath, heightPath])

  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace
    heightMap.colorSpace = THREE.NoColorSpace
    ;[colorMap, heightMap].forEach((tex) => {
      tex.anisotropy = 8
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.needsUpdate = true
    })
  }, [colorMap, heightMap])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBody: { value: body },
    uHeightScale: { value: isMars ? 0.015 : 0.009 },
    uBump: { value: isMars ? 2.0 : 1.55 },
    uRim: { value: new THREE.Color(rim) },
    uExposure: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0.85, 0.32, 0.42) },
    uLift: { value: new THREE.Vector3(0.02, 0.03, 0.05) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uStorm: { value: 0 },
    uColorMap: { value: colorMap },
    uHeightMap: { value: heightMap },
  }), [body, isMars, rim, colorMap, heightMap])

  const baseYaw = -Math.PI / 2
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    const g = gradeRef?.current
    if (g) {
      uniforms.uExposure.value = g.exposure
      uniforms.uLift.value.set(g.lift[0], g.lift[1], g.lift[2])
      uniforms.uGain.value.set(g.gain[0], g.gain[1], g.gain[2])
    }
    if (sunDirRef?.current) {
      uniforms.uSunDir.value.copy(sunDirRef.current)
    }
    uniforms.uStorm.value = isMars ? (stormRef?.current ?? 0) : 0
    if (mesh.current) {
      // Storm slows / stalls rotation — Opportunity dying
      const spinMul = isMars ? (1 - (stormRef?.current ?? 0) * 0.85) : 1
      mesh.current.rotation.y = baseYaw + s.clock.elapsedTime * spin * spinMul
    }
  })

  const segs = mobile ? 80 : 160
  return (
    <group ref={groupRef}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, segs, segs]} />
        <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={uniforms} />
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={rim}
          transparent
          opacity={isMars ? 0.05 : 0.04}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function PioneerProbe({ groupRef, carrierRef }) {
  const inner = useRef()
  const rings = useRef([])
  useFrame((s) => {
    if (inner.current) {
      const die = carrierRef?.current ?? 0
      inner.current.rotation.y = s.clock.elapsedTime * 0.08 * (1 - die * 0.7)
    }
    rings.current.forEach((mesh, i) => {
      if (!mesh) return
      const t = ((s.clock.elapsedTime * 0.35 + i * 0.9) % 3) / 3
      const sc = 0.4 + t * 3.5
      mesh.scale.set(sc, sc, sc)
      const c = carrierRef?.current ?? 0
      mesh.material.opacity = (1 - t) * 0.4 * (1 - c * 0.85)
    })
  })
  const dishPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 18; i++) {
      const t = i / 18
      pts.push(new THREE.Vector2(t * 0.9, t * t * 0.35))
    }
    return pts
  }, [])
  return (
    <group ref={groupRef} visible={false}>
      <group ref={inner} scale={1.05}>
        <mesh rotation={[Math.PI, 0, 0]} position={[0, 0.15, 0]}>
          <latheGeometry args={[dishPoints, 40]} />
          <meshStandardMaterial color="#b8c0cc" metalness={0.9} roughness={0.25} envMapIntensity={0.8} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.55, 0.35, 0.45]} />
          <meshStandardMaterial color="#6a7180" metalness={0.55} roughness={0.45} />
        </mesh>
        <mesh position={[0.28, 0.55, 0.24]}>
          <planeGeometry args={[0.18, 0.12]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={0.55} metalness={0.95} roughness={0.2} />
        </mesh>
        {[-1, 0, 1].map((s, i) => (
          <group key={i} rotation={[0, 0, (s * Math.PI) / 3]} position={[0, 0.55, 0]}>
            <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.014, 0.014, 1.1, 6]} />
              <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[1.25, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.2, 10]} />
              <meshStandardMaterial color="#4a4038" emissive="#ff6030" emissiveIntensity={0.28} />
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
            <torusGeometry args={[0.45, 0.008, 6, 48]} />
            <meshBasicMaterial color="#8ec8ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Inertia pointer — weight, not raw parallax */
function useInertiaPointer(mouse, reduced) {
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  useFrame((_, dt) => {
    if (reduced || !mouse?.current) return
    const s = state.current
    const tx = mouse.current.nx
    const ty = mouse.current.ny
    const ax = (tx - s.x) * 14
    const ay = (ty - s.y) * 14
    s.vx = s.vx * 0.86 + ax * dt
    s.vy = s.vy * 0.86 + ay * dt
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
  sunRef,
  gradeRef,
  diveRef,
  stormRef,
  carrierRef,
  warpRef,
  sunDirRef,
  onSample,
}) {
  const { camera, gl } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const inertia = useInertiaPointer(mouse, reduced)
  const lastDpr = useRef(1)

  useFrame((state, dt) => {
    const p = typeof progress?.get === 'function' ? progress.get() : 0
    const sample = sampleActs(p)
    onSample?.(sample)

    diveRef.current = sample.fx.dive
    stormRef.current = sample.fx.storm
    carrierRef.current = sample.fx.carrier
    warpRef.current = sample.fx.warp
    gradeRef.current = sample.grade

    // Adaptive DPR — drop under load / storm
    const targetDpr = clamp(
      (window.devicePixelRatio || 1) * (sample.fx.storm > 0.5 || sample.fx.dive > 0.6 ? 0.75 : 1),
      1,
      reduced ? 1.25 : 1.75,
    )
    if (Math.abs(targetDpr - lastDpr.current) > 0.08) {
      gl.setPixelRatio(targetDpr)
      lastDpr.current = targetDpr
    }

    const mx = inertia.current.x * (0.28 + sample.fx.warp * 0.2)
    const my = inertia.current.y * (0.18 + sample.fx.warp * 0.15)

    desired.set(
      sample.cam[0] + mx,
      sample.cam[1] - my,
      sample.cam[2] + Math.abs(mx) * 0.06,
    )

    // Smash cut: snap hard near crater smash point
    const damp = sample.smash ? 0.35 : (reduced ? 0.14 : 0.07)
    camera.position.x = lerp(camera.position.x, desired.x, damp)
    camera.position.y = lerp(camera.position.y, desired.y, damp)
    camera.position.z = lerp(camera.position.z, desired.z, damp)

    if ('fov' in camera) {
      camera.fov = lerp(camera.fov, sample.fov, sample.smash ? 0.4 : 0.08)
      camera.updateProjectionMatrix()
    }

    look.set(
      sample.look[0] + mx * 0.1,
      sample.look[1] - my * 0.06,
      sample.look[2],
    )
    camera.lookAt(look)

    // Body placement by focus
    const f = sample.focus
    if (moonRef.current) {
      const show = f === 'moon' || f === 'dive'
      moonRef.current.visible = show || sample.fx.dive > 0.05
      if (f === 'dive') {
        // Camera dives into moon — scale up toward camera
        const s = lerp(1.55, 4.2, sample.fx.dive)
        moonRef.current.scale.setScalar(s)
        moonRef.current.position.set(0.05, -0.02, 0)
      } else if (f === 'moon') {
        moonRef.current.scale.setScalar(lerp(1.55, 1.7, sample.eased * 0.3))
        moonRef.current.position.set(0, -0.04, 0)
      } else {
        moonRef.current.scale.setScalar(0.01)
      }
    }
    if (marsRef.current) {
      const show = f === 'mars' || f === 'storm'
      marsRef.current.visible = show
      if (show) {
        marsRef.current.position.set(2.75, 0.15, -0.5)
        marsRef.current.scale.setScalar(lerp(0.9, 1.25, f === 'storm' ? sample.eased : 0.4))
      } else {
        marsRef.current.scale.setScalar(0.01)
      }
    }
    if (pioneerRef.current) {
      const show = f === 'pioneer'
      pioneerRef.current.visible = show
      pioneerRef.current.position.set(0, 0.08, -9)
      pioneerRef.current.scale.setScalar(show ? lerp(0.8, 1.25, sample.eased) : 0.01)
    }
    if (sunRef.current) {
      const marsish = f === 'mars' || f === 'storm'
      sunRef.current.position.set(marsish ? 4.2 : 6.0, marsish ? 3.5 : 2.5, 3)
      sunRef.current.intensity = sample.grade.exposure * (f === 'storm' ? 0.55 : 1.45)
      sunRef.current.color.set(marsish ? '#ffc8a0' : '#fff6ea')
    }
    if (sunDirRef.current) {
      const marsish = f === 'mars' || f === 'storm'
      sunDirRef.current.set(marsish ? 0.65 : 0.85, marsish ? 0.5 : 0.32, marsish ? 0.3 : 0.42)
    }

    // Exposure on renderer
    gl.toneMappingExposure = lerp(gl.toneMappingExposure, sample.grade.exposure, 0.08)
  })

  return null
}

function ContinuumPost({ mobile, reduced, stormRef, diveRef }) {
  const [aberration] = useState(() => new Vector2(0.00015, 0.0002))
  useFrame(() => {
    const w = Math.max(stormRef?.current ?? 0, diveRef?.current ?? 0)
    aberration.set(0.00015 + w * 0.0012, 0.0002 + w * 0.001)
  })
  if (mobile || reduced) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.09} luminanceThreshold={0.93} luminanceSmoothing={0.2} mipmapBlur />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={aberration} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.045} />
      <Vignette eskil={false} offset={0.25} darkness={0.58} />
    </EffectComposer>
  )
}

function ContinuumScene({ progress, mouse, mobile, reduced, onSample }) {
  const moonRef = useRef()
  const marsRef = useRef()
  const pioneerRef = useRef()
  const sunRef = useRef()
  const gradeRef = useRef({ lift: [0.02, 0.03, 0.05], gain: [1, 1, 1], exposure: 1, grain: 0.04 })
  const diveRef = useRef(0)
  const stormRef = useRef(0)
  const carrierRef = useRef(0)
  const warpRef = useRef(0)
  const sunDirRef = useRef(new THREE.Vector3(0.85, 0.32, 0.42))
  const moonColor = mobile ? '/textures/moon_color_2k.jpg' : '/textures/moon_color_4k.jpg'

  return (
    <>
      <color attach="background" args={['#020206']} />
      <fog attach="fog" args={['#020206', 12, 65]} />
      <ambientLight intensity={0.08} />
      <directionalLight ref={sunRef} position={[6, 2.5, 3]} intensity={1.45} color="#fff6ea" />
      <directionalLight position={[-3, -0.5, -2]} intensity={0.16} color="#6a82ff" />

      <FilmDirector
        progress={progress}
        mouse={mouse}
        reduced={reduced}
        moonRef={moonRef}
        marsRef={marsRef}
        pioneerRef={pioneerRef}
        sunRef={sunRef}
        gradeRef={gradeRef}
        diveRef={diveRef}
        stormRef={stormRef}
        carrierRef={carrierRef}
        warpRef={warpRef}
        sunDirRef={sunDirRef}
        onSample={onSample}
      />

      <Starfield count={mobile ? 3200 : 7000} warpRef={warpRef} />
      {!mobile && <DustField count={1400} stormRef={stormRef} />}

      <Suspense fallback={null}>
        <BodySphere
          groupRef={moonRef}
          body={0}
          rim="#9ecfff"
          mobile={mobile}
          colorPath={moonColor}
          heightPath="/textures/moon_height_2k.jpg"
          gradeRef={gradeRef}
          stormRef={stormRef}
          sunDirRef={sunDirRef}
        />
        <BodySphere
          groupRef={marsRef}
          body={1}
          rim="#ff9a6a"
          mobile={mobile}
          spin={0.022}
          colorPath="/textures/mars_color_2k.jpg"
          heightPath="/textures/mars_bump_1k.jpg"
          gradeRef={gradeRef}
          stormRef={stormRef}
          sunDirRef={sunDirRef}
        />
      </Suspense>

      <PioneerProbe groupRef={pioneerRef} carrierRef={carrierRef} />
      <TransitionFX diveRef={diveRef} stormRef={stormRef} carrierRef={carrierRef} mouse={mouse} />
      <ContinuumPost mobile={mobile} reduced={reduced} stormRef={stormRef} diveRef={diveRef} />
    </>
  )
}

export default function ContinuumCanvas({ progress, mouse, mobile, reduced, active = true, onSample }) {
  return (
    <div className="continuum-canvas" aria-hidden>
      <Canvas
        dpr={mobile ? [1, 1.35] : [1, 1.75]}
        camera={{ position: [0.55, 0.28, 6.4], fov: 42, near: 0.05, far: 220 }}
        gl={{
          antialias: !mobile,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
        }}
        frameloop={active && !reduced ? 'always' : 'demand'}
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
        />
      </Canvas>
    </div>
  )
}

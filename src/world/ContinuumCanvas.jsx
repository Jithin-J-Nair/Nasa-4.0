/* eslint-disable react/no-unknown-property */
/**
 * ContinuumCanvas — one persistent WebGL world.
 * Scroll progress drives a directed camera journey:
 * Moon approach → lunar intimacy → Mars handoff → deep space / Pioneer.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }
function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
function mix3(a, b, t, out) {
  out.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))
  return out
}

/* ─── planet shaders: texture-first, cinematic terminator ─── */
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
  float disp = (h - 0.5) * uHeightScale;
  vec3 newPos = nrm * (1.0 + disp);
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
uniform sampler2D uColorMap;
uniform sampler2D uHeightMap;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
varying float vH;
void main(){
  vec3 tex = texture2D(uColorMap, vUv).rgb;
  // Preserve LROC / Mars albedo; mild grade only
  tex = pow(max(tex, 0.0), vec3(mix(0.92, 0.95, uBody)));
  tex = (tex - 0.5) * mix(1.22, 1.12, uBody) + 0.5;
  tex = clamp(tex, 0.0, 1.0);

  float h = texture2D(uHeightMap, vUv).r;
  vec3 N = normalize(vN);
  vec3 dp1 = dFdx(vWorld);
  vec3 dp2 = dFdy(vWorld);
  vec2 duv1 = dFdx(vUv);
  vec2 duv2 = dFdy(vUv);
  vec3 T = normalize(dp1 * duv2.y - dp2 * duv1.y);
  vec3 B = normalize(-dp1 * duv2.x + dp2 * duv1.x);
  float dhdx = dFdx(h);
  float dhdy = dFdy(h);
  N = normalize(N - (T * dhdx + B * dhdy) * uBump);

  vec3 L = normalize(uSunDir);
  vec3 Lfill = normalize(vec3(-0.45, -0.15, -0.55));
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = max(dot(N, L), 0.0);

  // Hard cinematic terminator (key light)
  float term = smoothstep(-0.08, 0.22, ndl);
  float night = 1.0 - term;

  vec3 albedo = tex;
  float hemi = N.y * 0.5 + 0.5;
  vec3 ambient = albedo * mix(0.045, 0.11, hemi);
  vec3 key = albedo * ndl * mix(1.15, 1.05, uBody);
  vec3 fill = albedo * max(dot(N, Lfill), 0.0) * 0.14;
  key *= mix(0.18, 1.0, term);
  fill *= mix(0.35, 1.0, term);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  vec3 rim = uRim * fres * mix(0.55, 0.28, uBody) * term;

  // Mars dust limb warmth / Moon cold limb
  vec3 nightGlow = mix(vec3(0.02, 0.03, 0.05), vec3(0.06, 0.02, 0.01), uBody) * night * 0.35;

  vec3 col = ambient + key + fill + rim + nightGlow;
  col *= uExposure;
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
varying float vAlpha;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec3 p = position;
  p.x += sin(uTime*0.012 + aSeed)*0.15;
  p.y += cos(uTime*0.01 + aSeed*2.1)*0.1;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float twinkle = 0.55 + 0.45*sin(uTime*(0.6+aSeed*2.0)+aSeed*14.0);
  vAlpha = twinkle;
  gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z) * (0.7 + 0.3*twinkle);
  gl_Position = projectionMatrix * mv;
}
`
const STAR_FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = smoothstep(0.5, 0.0, d);
  float a = core * vAlpha;
  if(a < 0.02) discard;
  gl_FragColor = vec4(vColor, a);
}
`

function Starfield({ count = 14000 }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 110
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      size[i] = 0.3 + Math.random() * 1.9
      seed[i] = Math.random()
      const warm = Math.random() > 0.88
      col[i * 3] = warm ? 1.0 : 0.82 + Math.random() * 0.18
      col[i * 3 + 1] = warm ? 0.88 : 0.88 + Math.random() * 0.12
      col[i * 3 + 2] = warm ? 0.62 : 1.0
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.75) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame((s) => { material.uniforms.uTime.value = s.clock.elapsedTime })
  return <points geometry={geo} material={material} frustumCulled={false} />
}

function BodySphere({
  body = 0,
  rim = '#9ecfff',
  scale = 1.55,
  position = [0, 0, 0],
  mobile = false,
  spin = 0.018,
  exposure = 1.0,
  sunDir = [0.85, 0.32, 0.42],
  colorPath,
  heightPath,
  groupRef,
}) {
  const mesh = useRef()
  const isMars = body > 0.5
  const [colorMap, heightMap] = useTexture([colorPath, heightPath])

  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace
    heightMap.colorSpace = THREE.NoColorSpace
    ;[colorMap, heightMap].forEach((tex) => {
      tex.anisotropy = 16
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
    uHeightScale: { value: isMars ? 0.016 : 0.01 },
    uBump: { value: isMars ? 2.2 : 1.65 },
    uRim: { value: new THREE.Color(rim) },
    uExposure: { value: exposure },
    uSunDir: { value: new THREE.Vector3(...sunDir) },
    uColorMap: { value: colorMap },
    uHeightMap: { value: heightMap },
  }), [body, isMars, rim, exposure, sunDir, colorMap, heightMap])

  const baseYaw = -Math.PI / 2
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uExposure.value = exposure
    uniforms.uSunDir.value.set(sunDir[0], sunDir[1], sunDir[2])
    if (mesh.current) {
      mesh.current.rotation.y = baseYaw + s.clock.elapsedTime * spin
    }
  })

  const segs = mobile ? 96 : 192
  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, segs, segs]} />
        <shaderMaterial
          vertexShader={PLANET_VERT}
          fragmentShader={PLANET_FRAG}
          uniforms={uniforms}
        />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={rim}
          transparent
          opacity={isMars ? 0.055 : 0.045}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function PioneerProbe({ groupRef }) {
  const inner = useRef()
  useFrame((s) => {
    if (inner.current) inner.current.rotation.y = s.clock.elapsedTime * 0.1
  })
  const dishPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const r = t * 0.9
      pts.push(new THREE.Vector2(r, r * r * 0.35))
    }
    return pts
  }, [])
  return (
    <group ref={groupRef} visible={false}>
      <group ref={inner} scale={1.05}>
        <mesh rotation={[Math.PI, 0, 0]} position={[0, 0.15, 0]}>
          <latheGeometry args={[dishPoints, 48]} />
          <meshStandardMaterial color="#b8c0cc" metalness={0.88} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.55, 0.35, 0.45]} />
          <meshStandardMaterial color="#6a7180" metalness={0.55} roughness={0.48} />
        </mesh>
        {[-0.2, 0, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.55, 0.23]}>
            <boxGeometry args={[0.06, 0.28, 0.01]} />
            <meshStandardMaterial color="#ff7a45" emissive="#ff7a45" emissiveIntensity={0.55} />
          </mesh>
        ))}
        {[-1, 0, 1].map((s, i) => (
          <group key={i} rotation={[0, 0, (s * Math.PI) / 3]} position={[0, 0.55, 0]}>
            <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.015, 0.015, 1.1, 6]} />
              <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[1.25, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.2, 12]} />
              <meshStandardMaterial color="#4a4038" emissive="#ff6030" emissiveIntensity={0.22} />
            </mesh>
          </group>
        ))}
        <mesh position={[0.28, 0.55, 0.24]}>
          <planeGeometry args={[0.18, 0.12]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={0.4} metalness={0.9} roughness={0.25} />
        </mesh>
      </group>
    </group>
  )
}

/** Camera + object choreography keyed to global scroll progress */
function ContinuumDirector({ progress, mouse, reduced, moonRef, marsRef, pioneerRef, sunRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  // Keyframes: [progress, camXYZ, lookXYZ, fov]
  const keys = useMemo(() => ([
    { p: 0.00, cam: [0.42, 0.22, 5.9], look: [0, 0, 0], fov: 40 },
    { p: 0.10, cam: [0.15, 0.18, 4.55], look: [0.05, 0, 0], fov: 36 },
    { p: 0.22, cam: [-0.55, 0.35, 3.85], look: [0.2, 0.05, 0], fov: 34 },
    { p: 0.36, cam: [1.8, 0.55, 5.2], look: [2.2, 0.2, -0.4], fov: 38 },
    { p: 0.48, cam: [2.55, 0.4, 3.6], look: [2.8, 0.15, -0.5], fov: 34 },
    { p: 0.62, cam: [1.2, 0.8, 7.5], look: [1.5, 0.2, -1], fov: 42 },
    { p: 0.78, cam: [0.2, 0.35, 5.4], look: [0, 0.2, -8], fov: 36 },
    { p: 1.00, cam: [0.55, 0.45, 4.6], look: [0, 0.15, -9], fov: 34 },
  ]), [])

  useFrame((state) => {
    const p = typeof progress?.get === 'function' ? progress.get() : (progress?.current ?? 0)
    const t = state.clock.elapsedTime

    let i = 0
    while (i < keys.length - 1 && p > keys[i + 1].p) i++
    const a = keys[i]
    const b = keys[Math.min(i + 1, keys.length - 1)]
    const u = a.p === b.p ? 0 : smoothstep(a.p, b.p, p)
    const ease = u * u * (3 - 2 * u)

    mix3(a.cam, b.cam, ease, desired)
    mix3(a.look, b.look, ease, lookTarget)

    let mx = 0
    let my = 0
    if (!reduced && mouse?.current) {
      mx = mouse.current.nx * 0.35
      my = mouse.current.ny * 0.22
    }
    desired.x += mx + Math.sin(t * 0.11) * 0.06
    desired.y += -my + Math.sin(t * 0.18) * 0.04
    desired.z += Math.abs(mx) * 0.08

    const damp = reduced ? 0.12 : 0.055
    camera.position.x = lerp(camera.position.x, desired.x, damp)
    camera.position.y = lerp(camera.position.y, desired.y, damp)
    camera.position.z = lerp(camera.position.z, desired.z, damp)

    const fov = lerp(a.fov, b.fov, ease)
    if ('fov' in camera) {
      camera.fov = lerp(camera.fov, fov, 0.05)
      camera.updateProjectionMatrix()
    }

    look.lerp(lookTarget, damp)
    camera.lookAt(look.x + mx * 0.12, look.y - my * 0.06, look.z)

    // Object visibility / placement by act
    const moonAmt = 1 - smoothstep(0.42, 0.58, p)
    const marsEnter = smoothstep(0.28, 0.42, p)
    const marsExit = 1 - smoothstep(0.58, 0.72, p)
    const marsAmt = marsEnter * marsExit
    const deepAmt = smoothstep(0.68, 0.82, p)

    if (moonRef?.current) {
      moonRef.current.visible = moonAmt > 0.02
      const s = lerp(1.55, 1.35, smoothstep(0, 0.2, p))
      moonRef.current.scale.setScalar(s * lerp(1, 0.55, 1 - moonAmt))
      moonRef.current.position.x = lerp(0, -2.4, smoothstep(0.3, 0.5, p))
      moonRef.current.position.y = lerp(-0.05, 0.4, smoothstep(0.3, 0.5, p))
    }
    if (marsRef?.current) {
      marsRef.current.visible = marsAmt > 0.02
      marsRef.current.position.set(
        lerp(3.4, 2.75, marsEnter),
        lerp(0.8, 0.2, marsEnter),
        lerp(-1.2, -0.55, marsEnter),
      )
      marsRef.current.scale.setScalar(lerp(0.01, 1.15, marsAmt))
    }
    if (pioneerRef?.current) {
      pioneerRef.current.visible = deepAmt > 0.05
      pioneerRef.current.position.set(0, 0.1, -9)
      pioneerRef.current.scale.setScalar(lerp(0.01, 1.2, deepAmt))
    }
    if (sunRef?.current) {
      // Warm sun drifts as we leave lunar for Mars
      const sx = lerp(6.2, 4.5, smoothstep(0.3, 0.55, p))
      const sy = lerp(2.6, 3.8, smoothstep(0.3, 0.55, p))
      sunRef.current.position.set(sx, sy, 3.2)
      sunRef.current.intensity = lerp(1.55, 1.25, smoothstep(0.35, 0.55, p))
      sunRef.current.color.set(p > 0.4 ? '#ffe8d4' : '#fff6ea')
    }

    invalidate()
  })

  return null
}

function ContinuumPost({ mobile, reduced }) {
  if (mobile || reduced) return null
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.1} luminanceThreshold={0.92} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.28} darkness={0.55} />
    </EffectComposer>
  )
}

function ContinuumScene({ progress, mouse, mobile, reduced }) {
  const moonRef = useRef()
  const marsRef = useRef()
  const pioneerRef = useRef()
  const sunRef = useRef()
  const moonColor = mobile ? '/textures/moon_color_2k.jpg' : '/textures/moon_color_4k.jpg'

  return (
    <>
      <color attach="background" args={['#030308']} />
      <fog attach="fog" args={['#030308', 14, 70]} />
      <ambientLight intensity={0.12} />
      <directionalLight ref={sunRef} position={[6.2, 2.6, 3.2]} intensity={1.55} color="#fff6ea" />
      <directionalLight position={[-3.2, -0.6, -2.4]} intensity={0.22} color="#7a92ff" />
      <pointLight position={[3.2, 1.0, 1.2]} intensity={0.22} color="#ff7a45" distance={16} />

      <ContinuumDirector
        progress={progress}
        mouse={mouse}
        reduced={reduced}
        moonRef={moonRef}
        marsRef={marsRef}
        pioneerRef={pioneerRef}
        sunRef={sunRef}
      />

      <Starfield count={mobile ? 6000 : 14000} />

      <Suspense fallback={null}>
        <BodySphere
          groupRef={moonRef}
          body={0}
          rim="#9ecfff"
          scale={1.55}
          mobile={mobile}
          spin={0.016}
          colorPath={moonColor}
          heightPath="/textures/moon_height_2k.jpg"
          sunDir={[0.85, 0.32, 0.42]}
        />
        <BodySphere
          groupRef={marsRef}
          body={1}
          rim="#ff9a6a"
          scale={0.01}
          position={[3.2, 0.5, -0.8]}
          mobile={mobile}
          spin={0.028}
          colorPath="/textures/mars_color_2k.jpg"
          heightPath="/textures/mars_bump_1k.jpg"
          sunDir={[0.7, 0.45, 0.35]}
          exposure={1.05}
        />
      </Suspense>

      <PioneerProbe groupRef={pioneerRef} />
      <ContinuumPost mobile={mobile} reduced={reduced} />
    </>
  )
}

export default function ContinuumCanvas({ progress, mouse, mobile, reduced, active = true }) {
  return (
    <div className="continuum-canvas" aria-hidden>
      <Canvas
        dpr={mobile ? [1, 1.4] : [1, 1.85]}
        camera={{ position: [0.42, 0.22, 5.9], fov: 40, near: 0.1, far: 220 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
        }}
        frameloop={active && !reduced ? 'always' : 'never'}
        onCreated={({ gl }) => {
          gl.setClearColor('#030308')
          gl.toneMapping = THREE.ACESFilmicToneMapping
        }}
      >
        <ContinuumScene progress={progress} mouse={mouse} mobile={mobile} reduced={reduced} />
      </Canvas>
    </div>
  )
}

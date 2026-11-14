/* eslint-disable react/no-unknown-property */
/**
 * Fleet shelf — Folio/Vasari hardcover wave with dossier covers.
 * Covers are full-bleed NASA photos (object-fit: cover) on 3:4 boxes,
 * colour-graded into the black stage so they no longer read as white cards.
 */
import {
  Suspense, useEffect, useMemo, useRef, useState, useCallback,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ARTIFACTS } from '../data/artifacts'

const K = 70
const C = 12.5
const SUBSTEPS = 4
/** Dossier card ~3:4 (image 1), thinner spine like a VHS box */
const BOOK_W = 0.78
const BOOK_H = 1.04
const BOOK_D = 0.11

const ORDER = [
  0, 9, 5, 11, 2, 13, 7, 1, 10, 4, 14, 6, 3, 12, 8,
  0, 11, 5, 9, 2, 13, 7, 1, 10, 4, 14, 6, 3, 12, 8, 0, 9,
]

const coverCache = new Map()

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/** Full-bleed cover canvas — photo fills the face, dark grade for black stage. */
async function buildCoverTexture(artifact) {
  const key = artifact.id
  if (coverCache.has(key)) return coverCache.get(key)

  const W = 474
  const H = 632 // ~3:4
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Base — deep charcoal matching fleet stage
  ctx.fillStyle = '#0a0b10'
  ctx.fillRect(0, 0, W, H)

  const url = artifact.image
  if (url) {
    try {
      const img = await loadImage(url)
      // object-fit: cover
      const ir = img.width / img.height
      const cr = W / H
      let dw = W
      let dh = H
      let dx = 0
      let dy = 0
      if (ir > cr) {
        dw = H * ir
        dx = (W - dw) / 2
      } else {
        dh = W / ir
        dy = (H - dh) / 2
      }
      ctx.drawImage(img, dx, dy, dw, dh)
    } catch {
      // keep charcoal base
    }
  }

  // Blend into black stage — vignette + cool multiply wash
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.15, W * 0.5, H * 0.5, H * 0.78)
  g.addColorStop(0, 'rgba(4,5,10,0)')
  g.addColorStop(0.55, 'rgba(4,5,10,0.28)')
  g.addColorStop(1, 'rgba(2,2,6,0.72)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(8, 12, 22, 0.22)'
  ctx.fillRect(0, 0, W, H)

  // Thin bottom credit strip (dossier DNA) — does not steal the image field
  const strip = Math.round(H * 0.11)
  const fade = ctx.createLinearGradient(0, H - strip * 2.2, 0, H)
  fade.addColorStop(0, 'rgba(4,5,10,0)')
  fade.addColorStop(0.45, 'rgba(4,5,10,0.55)')
  fade.addColorStop(1, 'rgba(4,5,10,0.92)')
  ctx.fillStyle = fade
  ctx.fillRect(0, H - strip * 2.2, W, strip * 2.2)

  ctx.fillStyle = 'rgba(232,238,245,0.88)'
  ctx.font = `600 ${Math.round(W * 0.038)}px "IBM Plex Mono", monospace`
  ctx.letterSpacing = '0.06em'
  const credit = `${artifact.credit || 'NASA'} · ${artifact.coords || ''}`.slice(0, 42)
  ctx.fillText(credit, W * 0.06, H - strip * 0.38)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.needsUpdate = true
  coverCache.set(key, tex)
  return tex
}

function makePageTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  // Dark page edges — blend with void, not cream Folio paper
  ctx.fillStyle = '#1a1c22'
  ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = `rgba(90, 95, 110, ${0.04 + (y % 7) * 0.008})`
    ctx.fillRect(0, y, 256, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function makeSpineMaterial(hex) {
  const c = new THREE.Color(hex || '#4a5560')
  c.multiplyScalar(0.28)
  c.offsetHSL(0, -0.15, -0.08)
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.62,
    clearcoat: 0.18,
    metalness: 0.12,
  })
}

function useCoverTexture(artifact) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let live = true
    buildCoverTexture(artifact).then((t) => {
      if (live) setTex(t)
    })
    return () => { live = false }
  }, [artifact])
  return tex
}

function BookMesh({
  artifact,
  index,
  pageTex,
  geo,
  pointer,
  introT,
  onSelect,
}) {
  const group = useRef()
  const mesh = useRef()
  const springY = useRef({ y: -3, v: 0 })
  const springZ = useRef({ z: 0, v: 0 })
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const coverMap = useCoverTexture(artifact)

  const mats = useMemo(() => {
    const cover = new THREE.MeshPhysicalMaterial({
      map: coverMap || null,
      color: coverMap ? '#ffffff' : '#12141a',
      roughness: 0.48,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
      metalness: 0.04,
      emissive: new THREE.Color('#05070c'),
      emissiveIntensity: 0.15,
    })
    const spine = makeSpineMaterial(artifact.color)
    const pages = new THREE.MeshStandardMaterial({
      map: pageTex,
      color: '#c8ccd4',
      roughness: 0.92,
      metalness: 0,
    })
    const back = spine.clone()
    back.roughness = 0.7
    // +x -x +y -y +z -z  → fore-edge, spine, top, bottom, cover, back
    return [pages, spine, pages, pages, cover, back]
  }, [coverMap, pageTex, artifact.color])

  useEffect(() => {
    const cover = mats[4]
    if (cover && coverMap) {
      cover.map = coverMap
      cover.color.set('#ffffff')
      cover.needsUpdate = true
    }
  }, [coverMap, mats])

  useEffect(() => () => {
    mats.forEach((m) => {
      if (m.map && m.map !== pageTex && m.map !== coverMap) m.map.dispose()
      m.dispose()
    })
  }, [mats, pageTex, coverMap])

  useFrame((state, dt) => {
    const g = group.current
    const m = mesh.current
    if (!g || !m) return
    const h = Math.min(0.05, Math.max(0.001, dt)) / SUBSTEPS
    const t = introT.current
    const unlocked = t > 0.25 + (ORDER.length - 1 - index) * 0.035

    tmp.set(0, 0.1, 0)
    m.localToWorld(tmp)
    tmp.project(state.camera)
    const sx = (tmp.x * 0.5 + 0.5) * state.size.width
    const sy = (-tmp.y * 0.5 + 0.5) * state.size.height

    let influence = 0
    if (pointer.current.active && unlocked) {
      const s = Math.max(state.size.width, state.size.height) * 0.085
      const dx = sx - pointer.current.x
      const dy = (sy - pointer.current.y) * 0.55
      influence = Math.exp(-(dx * dx + dy * dy) / (s * s))
    }

    const targetY = unlocked ? 0.78 * influence : -3
    const targetZ = unlocked ? 0.78 * influence * 0.35 : 0

    for (let i = 0; i < SUBSTEPS; i++) {
      const sy_ = springY.current
      sy_.v += ((targetY - sy_.y) * K - sy_.v * C) * h
      sy_.y += sy_.v * h
      const sz = springZ.current
      sz.v += ((targetZ - sz.z) * K - sz.v * C) * h
      sz.z += sz.v * h
    }

    m.position.y = springY.current.y
    m.position.z = springZ.current.z
    m.rotation.x = -springY.current.v * 0.012
  })

  const i = index
  return (
    <group
      ref={group}
      position={[1.35 + i * -0.42, -1.05, 0.75 + i * -0.18]}
      rotation={[0, 0.34, 0]}
    >
      <mesh
        ref={mesh}
        geometry={geo}
        material={mats}
        castShadow={false}
        receiveShadow={false}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.(artifact)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      />
    </group>
  )
}

function BookRow({ onSelect, pointer, introT }) {
  const geo = useMemo(() => new THREE.BoxGeometry(BOOK_W, BOOK_H, BOOK_D), [])
  const pageTex = useMemo(() => makePageTexture(), [])
  const books = useMemo(
    () => ORDER.map((ai, i) => ({
      key: `${i}-${ARTIFACTS[ai % ARTIFACTS.length].id}`,
      artifact: ARTIFACTS[ai % ARTIFACTS.length],
      index: i,
    })),
    [],
  )

  useEffect(() => () => {
    geo.dispose()
    pageTex.dispose()
  }, [geo, pageTex])

  return (
    <group>
      {/* Opaque stage plate — kills continuum Moon bleed through transparent canvas */}
      <mesh position={[0, -1.35, -2.2]} rotation={[-0.12, 0.2, 0]} raycast={() => null}>
        <planeGeometry args={[28, 14]} />
        <meshBasicMaterial color="#000000" depthWrite={false} />
      </mesh>
      {books.map((b) => (
        <BookMesh
          key={b.key}
          artifact={b.artifact}
          index={b.index}
          pageTex={pageTex}
          geo={geo}
          pointer={pointer}
          introT={introT}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

function SceneLights() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    if ('environmentIntensity' in scene) scene.environmentIntensity = 0.32
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return (
    <>
      <ambientLight intensity={0.08} color="#a8b4c8" />
      <directionalLight color="#d8e4ff" intensity={1.55} position={[-4, 6, 6]} />
      <directionalLight color="#6a7a9a" intensity={0.55} position={[6, 3, -4]} />
    </>
  )
}

function PointerDriver({ pointer, idle, introT }) {
  const { size, gl } = useThree()
  const start = useRef(performance.now())
  const lastMove = useRef(performance.now())
  const coarse = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  )

  useEffect(() => {
    const el = gl.domElement
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      pointer.current.x = e.clientX - rect.left
      pointer.current.y = e.clientY - rect.top
      pointer.current.active = true
      lastMove.current = performance.now()
      idle.current = false
    }
    const onLeave = () => { pointer.current.active = false }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [gl, pointer, idle])

  useFrame(() => {
    const now = performance.now()
    introT.current = (now - start.current) / 1000
    if (coarse || now - lastMove.current > 4000) {
      idle.current = true
      const u = (Math.sin(now * 0.001 * 0.45) + 1) / 2
      pointer.current.x = size.width * (0.18 + u * 0.64)
      pointer.current.y = size.height * (0.58 + Math.sin(now * 0.001 * 0.3) * 0.06)
      pointer.current.active = true
    }
  })

  return null
}

function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const portrait = size.width < size.height
    camera.fov = portrait ? 40 : 19.5
    camera.position.set(3.2, 1.85, 6.6)
    camera.lookAt(-1.1, 0.02, -0.5)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function FleetBooks({ onSelect }) {
  const pointer = useRef({ x: 0, y: 0, active: false })
  const idle = useRef(false)
  const introT = useRef(0)
  const handleSelect = useCallback((a) => onSelect?.(a), [onSelect])

  return (
    <div className="fleet-books-canvas">
      <Canvas
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
        camera={{ fov: 19.5, near: 0.1, far: 80, position: [3.2, 1.85, 6.6] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor('#000000', 1)
          camera.lookAt(-1.1, 0.02, -0.5)
        }}
      >
        <CameraRig />
        <SceneLights />
        <PointerDriver pointer={pointer} idle={idle} introT={introT} />
        <Suspense fallback={null}>
          <BookRow onSelect={handleSelect} pointer={pointer} introT={introT} />
        </Suspense>
      </Canvas>
    </div>
  )
}

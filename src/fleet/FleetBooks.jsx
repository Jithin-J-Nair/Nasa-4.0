/* eslint-disable react/no-unknown-property */
/**
 * Folio-style rising hardcover row — Silent Fleet dossiers as covers.
 * Springs + pointer wave from the Folio bookshop prompt; brand stays Silent Fleet.
 */
import {
  Suspense, useEffect, useMemo, useRef, useState, useCallback,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ARTIFACTS } from '../data/artifacts'

const K = 70
const C = 12.5
const SUBSTEPS = 4
const BOOK_W = 1
const BOOK_H = 1.5
const BOOK_D = 0.2

/** Front → back display order (indices into ARTIFACTS, cycled to fill a dense row). */
const ORDER = [
  0, 9, 5, 11, 2, 13, 7, 1, 10, 4, 14, 6, 3, 12, 8,
  0, 11, 5, 9, 2, 13, 7, 1, 10, 4, 14, 6, 3, 12, 8, 0, 9,
]

function makePageTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#efe7d6'
  ctx.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = `rgba(90, 60, 30, ${0.05 + (y % 7) * 0.01})`
    ctx.fillRect(0, y, 256, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function makeSpineMaterial(hex) {
  const c = new THREE.Color(hex || '#6e7584')
  c.multiplyScalar(0.62)
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.55,
    clearcoat: 0.3,
    metalness: 0.05,
  })
}

function BookMesh({
  artifact,
  index,
  pageTex,
  geo,
  pointer,
  idle,
  introT,
  onSelect,
}) {
  const group = useRef()
  const mesh = useRef()
  const springY = useRef({ y: -3, v: 0 })
  const springZ = useRef({ z: 0, v: 0 })
  const screen = useRef({ x: 0, y: 0 })
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const coverUrl = artifact.image || '/textures/moon_color_2k.jpg'
  const coverMap = useTexture(coverUrl)
  const mats = useMemo(() => {
    coverMap.colorSpace = THREE.SRGBColorSpace
    coverMap.anisotropy = 16
    coverMap.wrapS = coverMap.wrapT = THREE.ClampToEdgeWrapping
    const cover = new THREE.MeshPhysicalMaterial({
      map: coverMap,
      roughness: 0.42,
      clearcoat: 0.55,
      clearcoatRoughness: 0.35,
      metalness: 0.08,
    })
    const spine = makeSpineMaterial(artifact.color)
    const pagesH = new THREE.MeshStandardMaterial({
      map: pageTex,
      roughness: 0.9,
      metalness: 0,
    })
    const pagesV = pagesH.clone()
    if (pagesV.map) {
      pagesV.map = pageTex.clone()
      pagesV.map.rotation = Math.PI / 2
      pagesV.map.center.set(0.5, 0.5)
      pagesV.map.needsUpdate = true
    }
    const back = spine.clone()
    back.roughness = 0.6
    // Box faces: +x -x +y -y +z -z
    return [pagesH, spine, pagesV, pagesV.clone(), cover, back]
  }, [coverMap, pageTex, artifact.color])

  useEffect(() => () => {
    mats.forEach((m) => {
      m.map?.dispose?.()
      m.dispose()
    })
  }, [mats])

  useFrame((state, dt) => {
    const g = group.current
    const m = mesh.current
    if (!g || !m) return
    const h = Math.min(0.05, Math.max(0.001, dt)) / SUBSTEPS
    const t = introT.current
    const unlocked = t > 0.25 + (ORDER.length - 1 - index) * 0.035

    // Project book reference point to screen
    tmp.set(0, 0.1, 0)
    m.localToWorld(tmp)
    tmp.project(state.camera)
    const sx = (tmp.x * 0.5 + 0.5) * state.size.width
    const sy = (-tmp.y * 0.5 + 0.5) * state.size.height
    screen.current.x = sx
    screen.current.y = sy

    let influence = 0
    if (pointer.current.active && unlocked) {
      const s = Math.max(state.size.width, state.size.height) * 0.085
      const dx = sx - pointer.current.x
      const dy = (sy - pointer.current.y) * 0.55
      influence = Math.exp(-(dx * dx + dy * dy) / (s * s))
    }

    let targetY = unlocked ? 0.78 * influence : -3
    if (!unlocked) targetY = -3
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
      position={[1.55 + i * -0.5, -1.12, 0.9 + i * -0.2]}
      rotation={[0, 0.32, 0]}
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

function BookRow({ onSelect, pointer, introT, idle }) {
  const geo = useMemo(() => new THREE.BoxGeometry(BOOK_W, BOOK_H, BOOK_D), [])
  const pageTex = useMemo(() => makePageTexture(), [])
  const books = useMemo(
    () => ORDER.map((ai, i) => ({ key: `${i}-${ARTIFACTS[ai % ARTIFACTS.length].id}`, artifact: ARTIFACTS[ai % ARTIFACTS.length], index: i })),
    [],
  )

  useEffect(() => () => {
    geo.dispose()
    pageTex.dispose()
  }, [geo, pageTex])

  return (
    <group>
      {books.map((b) => (
        <BookMesh
          key={b.key}
          artifact={b.artifact}
          index={b.index}
          pageTex={pageTex}
          geo={geo}
          pointer={pointer}
          idle={idle}
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
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight color="#fff3e4" intensity={2.4} position={[-4, 6, 6]} />
      <directionalLight color="#bfd2ff" intensity={1.1} position={[6, 3, -4]} />
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
    const onLeave = () => {
      pointer.current.active = false
    }
    const onBlur = () => {
      pointer.current.active = false
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onBlur)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onBlur)
    }
  }, [gl, pointer, idle])

  useFrame(() => {
    const now = performance.now()
    introT.current = (now - start.current) / 1000
    if (coarse || now - lastMove.current > 4000) {
      idle.current = true
      const u = (Math.sin(now * 0.001 * 0.45) + 1) / 2
      // Sweep between near-back and near-front of the row
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
    camera.position.set(3.6, 2.15, 7.4)
    camera.lookAt(-1.4, 0.05, -0.6)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function FleetBooks({ onSelect }) {
  const pointer = useRef({ x: 0, y: 0, active: false })
  const idle = useRef(false)
  const introT = useRef(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  const handleSelect = useCallback((a) => onSelect?.(a), [onSelect])

  return (
    <div className="fleet-books-canvas" aria-hidden={false}>
      <Canvas
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
        camera={{ fov: 19.5, near: 0.1, far: 80, position: [3.6, 2.15, 7.4] }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0)
          camera.lookAt(-1.4, 0.05, -0.6)
        }}
      >
        <CameraRig />
        <SceneLights />
        <PointerDriver pointer={pointer} idle={idle} introT={introT} />
        <Suspense fallback={null}>
          <BookRow
            onSelect={handleSelect}
            pointer={pointer}
            introT={introT}
            idle={idle}
          />
        </Suspense>
        {reduced ? null : null}
      </Canvas>
    </div>
  )
}

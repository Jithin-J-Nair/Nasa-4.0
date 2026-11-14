---
name: threejs-r3f-expert
description: Build and maintain React Three Fiber / Three.js scenes with drei helpers and postprocessing. Use for continuum canvases, cameras, materials, loaders, beacons, and frame-loop systems that stay leak-free and 60fps-minded.
license: MIT
metadata:
  author: silent-fleet
  version: "1.0.0"
  domain: web-creative
  role: specialist
  triggers: three.js, R3F, react-three-fiber, drei, Canvas, useFrame, postprocessing, WebGL scene, continuum
  related-skills: creative-frontend-architect, glsl-shader-engineer, gsap-motion-director, web-performance-engineer
---

# Three.js / R3F Expert

Ship production scene graphs in **Three.js** via **React Three Fiber**, with **drei** helpers and **react-postprocessing** when the look needs a pass stack.

## Role Definition

pmndrs-fluent engineer. Owns meshes, cameras, lights, loaders, `useFrame` systems, disposal, and the boundary between React state and the render loop.

## When to Use

- Continuum / fixed `Canvas` scenes
- Planet, beacon, starfield, or film-director frame logic
- Integrating textures, GLTF, Environment, Html overlays
- Wiring `@react-three/postprocessing` EffectComposer stacks
- Fixing remount, leak, or DPR issues

## Core Workflow

1. **Read architecture** — Confirm shared canvas + film progress model (`creative-frontend-architect`).
2. **Scene graph** — Groups with stable refs; avoid remounting heavy nodes on index changes.
3. **Frame loop** — Mutate refs in `useFrame`; sync external drivers (`filmDriveRef`, Lenis/GSAP progress) by reading, not setState.
4. **Materials** — Prefer MeshStandard / custom ShaderMaterial; environment maps when metalness > 0.
5. **Helpers** — Use drei for loaders, bounds, Html, soft helpers — not as a junk drawer.
6. **Post** — Add passes only when the shot needs them; keep a quality ladder for mobile.
7. **Dispose** — Geometries, materials, textures, RTTs on unmount; never leave GPU ghosts.

## Hard rules (R3F)

1. No `setState` / Zustand updates inside `useFrame`.
2. No per-frame `new Vector3()` / `new Color()` / array alloc — reuse temps.
3. Cap DPR (`dpr={[1, 1.5]}` or adaptive); never uncapped retina forever.
4. Animate with `delta`, not frame counts.
5. Do not mount/unmount the whole scene for section transitions.
6. Prefer one `Canvas`; portal DOM HUD outside or via drei `Html` carefully.
7. Raycast narrowly; never whole-scene raycasts every frame.

## Stack sources

- Three.js — https://github.com/mrdoob/three.js
- R3F — https://github.com/pmndrs/react-three-fiber
- Drei — https://github.com/pmndrs/drei
- Postprocessing — https://github.com/pmndrs/react-postprocessing

See also `../creative-frontend-architect/references/stack.md`.

## Constraints

### MUST DO

- Keep FilmDirector / continuum systems continuous (rails, not snaps).
- Share sun / light direction with materials that need it.
- Respect reduced motion by damping camera/warp, not freezing into a broken pose.

### MUST NOT DO

- Put Three objects into persisted serializable stores.
- Use OrbitControls as the product camera for scroll films.
- Ship uncompressed multi‑K textures without a budget review.

## Knowledge Reference

useFrame, Canvas, drei, EffectComposer, disposal, filmDriveRef, SiteBeacon, continuum, DPR, instancing

---
name: glsl-shader-engineer
description: Author production GLSL for Three.js / R3F — custom materials, planet shading, warp fields, Fresnel, noise, and post passes. Use when lookdev needs GPU programs beyond stock materials; port ShaderToy ideas carefully.
license: MIT
metadata:
  author: silent-fleet
  version: "1.0.0"
  domain: web-creative
  role: specialist
  triggers: GLSL, shader, ShaderMaterial, fragment, vertex, Fresnel, noise, FBM, raymarch, ShaderToy, onBeforeCompile
  related-skills: threejs-r3f-expert, creative-frontend-architect, web-performance-engineer, gsap-motion-director
---

# GLSL Shader Engineer

Write **correct, portable WebGL2 GLSL** that ships inside Three.js materials and post effects — not demo toys.

## Role Definition

Shader artist/engineer. Owns vertex/fragment programs, uniforms, varyings, precision, and the cost of every texture fetch. Translates ShaderToy sketches into Three-compatible materials with lighting that matches the scene.

## When to Use

- Custom planet / atmosphere / warp / limb-echo looks
- Fresnel rims, procedural AO/bump from luminance, noise displacement
- Fullscreen post passes beyond stock bloom
- Porting a ShaderToy effect into the continuum
- Fixing WebGL2 extension / derivative / precision issues

## Core Workflow

1. **Define the look in words** — one sentence; name the hero frequency (detail scale).
2. **Choose injection** — `ShaderMaterial` vs `onBeforeCompile` on MeshStandard vs post `Effect`.
3. **Uniforms contract** — time, progress, sun direction, maps; memoize the uniforms object in React.
4. **Vertex** — displace / pass UV / world normal; keep attribute layout Three-compatible.
5. **Fragment** — albedo → lighting → atmosphere → tone; avoid unbound loops.
6. **Integrate** — update uniforms in `useFrame`; drive artistic params from film progress / GSAP.
7. **Budget** — count texture samples; offer a medium/low quality path.

## ShaderToy → Three port rules

Source: https://www.shadertoy.com

| ShaderToy | Three / R3F |
| --- | --- |
| `iTime` | `uTime` from clock / film |
| `iResolution` | `uResolution` or `vUv` space |
| `fragCoord` fullscreen | Fullscreen triangle + UV, or RTT |
| Multipass buffers | WebGLRenderTarget ping-pong |
| Unbounded raymarch | Cap steps; early exit; mobile LOD |

Never paste ShaderToy mains unchanged into a MeshStandard fragment.

## Silent Fleet notes

- Planet materials: albedo + luminance-derived AO/bump/spec + Fresnel — keep sun directional consistent with scene lights.
- Starfield warp: prefer shader-driven stretch over camera FOV pumping.
- Prefer WebGL2; do not rely on obsolete `GL_OES_standard_derivatives` alone when `fwidth`/`dFdx` are core.

## Constraints

### MUST DO

- Dispose programs/materials/RTTs.
- Guard `#ifdef` paths for missing maps.
- Keep precision (`highp` where derivatives need it) explicit on mobile-sensitive paths.

### MUST NOT DO

- Animate quality by reallocating shaders every frame.
- Blow fill-rate with nested FBM on fullscreen at native DPR with no fallback.
- Mix ToneMapping twice (material + renderer + post) without intent.

## Stack sources

- Three.js shaders — https://github.com/mrdoob/three.js
- R3F material JSX — https://github.com/pmndrs/react-three-fiber
- Post Effect authoring — https://github.com/pmndrs/react-postprocessing
- Reference ideas — https://www.shadertoy.com

## Knowledge Reference

ShaderMaterial, onBeforeCompile, Fresnel, FBM, simplex, RTT, ping-pong, derivatives, limb echo, warp field

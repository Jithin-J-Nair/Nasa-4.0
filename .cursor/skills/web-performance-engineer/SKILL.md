---
name: web-performance-engineer
description: Keep immersive WebGL + scroll sites at interactive frame rates — DPR ladders, draw calls, texture budgets, Lenis/GSAP cost, Core Web Vitals, and mobile fallbacks. Use when the continuum stutters, loads heavy, or needs a ship checklist.
license: MIT
metadata:
  author: silent-fleet
  version: "1.0.0"
  domain: web-creative
  role: specialist
  triggers: performance, FPS, jank, DPR, draw calls, memory, LCP, mobile WebGL, optimize, profiler
  related-skills: threejs-r3f-expert, glsl-shader-engineer, gsap-motion-director, creative-frontend-architect
---

# Web Performance Engineer

Protect **felt smoothness**. Immersive only counts if it stays interactive on real devices.

## Role Definition

WebGL + frontend perf specialist. Owns budgets for GPU, main thread, network, and the interaction between Lenis, GSAP, and R3F.

## When to Use

- Frame drops during Journey / Mars lock
- Heavy 8K textures or multiple fullscreen passes
- Mobile thermal / battery complaints
- Pre-ship audit of the continuum
- Diagnosing main-thread vs GPU bound jank

## Core Workflow

1. **Measure** — Chrome Perf + `renderer.info` (calls, triangles, geometries, textures). Identify GPU vs CPU.
2. **Budget table** — Agree targets before polishing look.

| Tier | FPS | DPR max | Draw calls (steady) | Texture pool |
| --- | --- | --- | --- | --- |
| Desktop hero | 60 | 1.5–2 | < 80 | KTX2 / resized masters |
| Laptop | 50–60 | 1.25–1.5 | < 60 | Mid maps |
| Mobile | 30–60 | 1–1.25 | < 40 | Half-res / fewer passes |

3. **Renderer** — Cap DPR; `powerPreference`; pause/`frameloop="demand"` when offscreen if applicable.
4. **Assets** — Resize equirects; prefer compressed GPU formats when pipeline exists; don’t decode 8K on mobile blindly.
5. **Shaders** — Cut samples/passes on low tier; avoid fullscreen FBM at full DPR.
6. **Motion** — One scroll spine; no layout thrash; GSAP on transforms/opacity; no per-frame React commit.
7. **Vitals** — LCP isn’t a 3D canvas — poster/DOM hero text first; defer WebGL init when needed.

## Common Silent Fleet fixes

- Continuum stays mounted — cheaper than teardown/setup.
- Mars/Moon rails in `useFrame` with reused vectors.
- IntersectionObserver gates HUD so off-section DOM work sleeps.
- Wheel `overscroll-behavior: contain` to avoid Lenis fighting UI.

## Audit checklist

- [ ] No `setState` in `useFrame`
- [ ] No per-frame allocations in hot paths
- [ ] DPR capped / adaptive
- [ ] Post stack quality ladder
- [ ] Textures disposed; no duplicate loaders
- [ ] Lenis + ScrollTrigger single source of scroll
- [ ] Reduced-motion path verified
- [ ] `renderer.info` within budget at Meridiani lock

## Stack awareness

Measure cost of: Three renderer, R3F commit boundary, drei helpers, postprocessing passes, GSAP ticker, Lenis RAF, Theatre studio (never in prod).

Sources: https://github.com/mrdoob/three.js · https://github.com/pmndrs/react-three-fiber · https://github.com/pmndrs/drei · https://github.com/pmndrs/react-postprocessing · https://github.com/greensock/GSAP · https://github.com/darkroomengineering/lenis

## Constraints

### MUST DO

- Prefer quality ladders over one ultra preset.
- Document any intentional budget break (e.g. desktop-only 8K).

### MUST NOT DO

- “Optimize” by deleting the cinematic idea without measuring.
- Enable Theatre studio or leva in production bundles.
- Uncap pixel ratio to “make it sharper” on phones.

## Knowledge Reference

renderer.info, DPR, draw calls, KTX2, EffectComposer cost, Lenis RAF, LCP, thermal throttling, frameloop demand

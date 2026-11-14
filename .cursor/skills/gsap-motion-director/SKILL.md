---
name: gsap-motion-director
description: Direct cinematic motion with GSAP, Lenis, and optional Theatre.js — scroll films, Journey timelines, critically damped UI springs, and camera choreography synced to R3F without React thrash. Use for scrollytelling and continuum transit.
license: MIT
metadata:
  author: silent-fleet
  version: "1.0.0"
  domain: web-creative
  role: specialist
  triggers: GSAP, ScrollTrigger, Lenis, Theatre.js, timeline, cinematic journey, scrub, film drive, spring wheel
  related-skills: creative-frontend-architect, threejs-r3f-expert, web-performance-engineer, glsl-shader-engineer
---

# GSAP Motion Director

Choreograph **time and scroll** so the continuum feels directed — not scrubbed raw and not over-eased into mush.

## Role Definition

Motion director for web films. Owns GSAP timelines, ScrollTrigger + Lenis sync, Theatre edit passes, and the contract that writes progress into refs the R3F loop reads.

## When to Use

- Journey / Moon→Mars cinematic transitions
- Scroll-scrubbed film acts
- HUD springs (OptionWheel, hotspots) that must not remount
- Syncing Lenis virtual scroll with ScrollTrigger
- Theatre.js keyed camera or prop takes (dev studio)

## Core Workflow

1. **Beat sheet** — Hold → leave → transit → arrive. Name durations and what the camera sells at each beat.
2. **Single spine** — Lenis owns smooth scroll; GSAP/ScrollTrigger reads that scroll (or programmatic `scrollTo`).
3. **Film drive** — Animate a normalized `p` (0…1) or act keys; R3F interpolates rails from `p`.
4. **Programmatic journeys** — Nav clicks kill conflicting tweens, clear atlas locks, then play a GSAP timeline that drives `filmDriveRef` + Lenis together.
5. **UI springs** — Critically damped target/velocity for wheels; controlled index without remount (`key` stable).
6. **RAF hygiene** — Prefer one ticker story: `gsap.ticker.lagSmoothing(0)` when sharing frames with WebGL; never double-smooth until mushy.
7. **Theatre (optional)** — `@theatre/core` sequences for editable takes; load `@theatre/studio` only in DEV. Prefer writing values into the same refs GSAP would.

## Sync pattern (canonical)

```text
Lenis / GSAP timeline
        ↓ writes
  filmDriveRef / progress ref  (mutable)
        ↓ reads each frame
  R3F useFrame → camera, planets, shaders
```

Do **not** `setState` progress every frame.

## Journey quality bar (Silent Fleet)

- Monotonic camera dolly — no accidental zoom breathe unless authored.
- Mars placement as a continuous rail (easeInOutCubic), not branch snaps.
- Contain wheel/overscroll so Lenis does not steal section focus.

## Stack sources

- GSAP — https://github.com/greensock/GSAP
- Lenis — https://github.com/darkroomengineering/lenis
- Theatre.js — https://github.com/theatre-js/theatre
- Camera consumers — https://github.com/pmndrs/react-three-fiber

## Constraints

### MUST DO

- Kill / overwrite competing timelines on nav re-entry.
- Honor `prefers-reduced-motion` with shortened or stepped takes.
- Keep drag vs click thresholds honest on interactive wheels.

### MUST NOT DO

- Mix native CSS scroll-smooth fighting Lenis.
- Remount OptionWheel / heavy HUD to change selection.
- Drive FOV oscillation for “energy” during transit.

## Knowledge Reference

ScrollTrigger, Lenis, filmDriveRef, playMoonToMarsJourney, critically damped spring, Theatre studio, gsap.context, lagSmoothing

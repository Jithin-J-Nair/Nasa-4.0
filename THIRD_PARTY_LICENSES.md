# Third-party materials — Silent Fleet

Required for NASA Space Apps Challenge submissions that use non-NASA materials.
Original Silent Fleet code is Apache-2.0 (`LICENSE`).

## OSI / permissive (freely usable)

| Package | License | Use |
|---------|---------|-----|
| React / React DOM | MIT | UI |
| Three.js / R3F / Drei / postprocessing | MIT | Continuum WebGL |
| Framer Motion / Motion | MIT | UI motion |
| Lenis | MIT | Smooth scroll |
| Fontsource (Syne, Space Grotesk, IBM Plex Mono, Unbounded) | OFL-1.1 | Typography |
| React Bits (vendored `src/bits/`) | MIT | UI craft components |
| Vite / oxlint (dev) | MIT | Tooling |

## NASA / public US government media

| Asset | Source | Notes |
|-------|--------|-------|
| Artifact photos | images.nasa.gov | Credited per item in `src/data/artifacts.js` |
| Coordinates / status | NSSDCA, lunar_sites, LROC | Challenge Resources — NSSDCA |
| Moon CGI reference | NASA SVS CGI Moon Kit (4720) | See `public/textures/ATTRIBUTION.txt` |
| Voyager.glb | NASA VTAD | `public/models/ATTRIBUTION.txt` |
| Score beds | EMFISIS chorus · Cassini Saturn radio | `public/audio/ATTRIBUTION.txt` — NASA Media Usage Guidelines; no endorsement implied |
| Pale Blue Dot Revisited | NASA / JPL-Caltech · Voyager 1 | `public/images/ATTRIBUTION.txt` — NASA Media Usage Guidelines; no endorsement implied |

## Proprietary free (not OSI) — documented risk

| Package | License | Use |
|---------|---------|-----|
| **gsap** / **@gsap/react** | [GSAP Standard “No Charge” License](https://gsap.com/standard-license) | Scroll/boot film motion |

GSAP is **free for commercial use** under Webflow’s Standard License but is **not** an OSI open-source license. Space Apps legal text asks that non-NASA Solution Materials be freely available without restriction **or** OSI-licensed. We use GSAP only as a runtime animation library (permitted use), document it here, and do not modify or rebrand GSAP. If organizers require OSI-only stacks, replace GSAP with Motion/CSS ScrollTimeline before final submit.

## Unused / removed from runtime

`@theatre/core` and `@theatre/studio` were previously listed in `package.json` but are **not imported** by the app. Studio’s AGPL-3.0 license must not ship in a production dependency set — remove if still present in `package.json`.

# SILENT FLEET

**Abandoned but not Forgotten** — NASA Space Apps Challenge 2026

A scroll-driven continuum experience about hardware NASA left on the Moon, Mars, and in deep space — built so school-age space fans walk away with a personal connection to these explorers and the science they conducted.

## Challenge objective

[NASA's Discarded Equipment Storytelling](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)

> By the end of your story, your audience might walk away feeling a personal connection to these forgotten robotic explorers and inspired by the science they conducted. **Accuracy is important throughout.**

## What this build is

One persistent WebGL world (Moon → Mars → Pioneer) directed by scroll, with editorial HTML chapters overlaid — not separate canvases per section.

- **Continuum camera** — scroll progress keys a cinematic journey through the solar system
- **NASA SVS CGI Moon Kit** — 4K LROC color + LOLA height (`public/textures/`)
- **Connect chapter** — Opportunity, Apollo 17, Voyager told by last transmission + science
- **15 verified dossiers** — NSSDCA / LROC / HiRISE coordinates + NASA imagery links
- **Procedural soundscape** — Web Audio bed that shifts with Moon / Mars / Deep acts (tap **AUDIO**)
- **Live Pioneer 10 AU counter** — heliocentric range estimate

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default port **3847**).

```bash
npm run build
npm run preview
```

## Experience map

1. Preloader — mission uplink  
2. Hero — brand + continuum Moon  
3. Prologue — pinned narrative (challenge objective)  
4. Connect — three personal explorer heartbeats  
5. Fleet / Archive — 15 dossiers with NASA media  
6. Moon map — LROC-anchored nearside pins  
7. Timeline · Voices · Stats  
8. Deep space — Pioneer 10 + live AU  
9. Footer — NASA resources + UTC clock  

## NASA data sources

- [Catalogue of Manmade Material on the Moon](https://www.nasa.gov/wp-content/uploads/2024/02/final-catalogue-of-manmade-material-on-the-moon.pdf)
- [NSSDCA Master Catalog](https://nssdc.gsfc.nasa.gov/nmc/)
- [CGI Moon Kit (SVS 4720)](https://svs.gsfc.nasa.gov/4720/)
- [LROC Image Archive](https://lroc.im-ldi.com/images)
- [Apollo Lunar Surface Journal](https://www.nasa.gov/history/alsj-and-afj/)
- [HiRISE / MRO](https://hirise.lpl.arizona.edu/)
- [Apollo ALSEP / PDS](https://pds-geosciences.wustl.edu/missions/apollo/)

## AI disclosure

Textures are NASA public products (see `public/textures/ATTRIBUTION.txt`). Application code was AI-assisted and is disclosed per NASA Space Apps 2026 guidelines.

## Stack

React 19 · Vite · Framer Motion · Lenis · Three.js · React Three Fiber · Drei · Postprocessing · Fontsource (Syne, Space Grotesk, IBM Plex Mono, Unbounded)

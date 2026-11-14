# SILENT FLEET

**Abandoned but not Forgotten** — NASA Space Apps Challenge 2026

An immersive storytelling experience about hardware NASA left on the Moon, Mars, and in deep space — and the science each piece made possible.

Built as a single-file React experience with Framer Motion, React Three Fiber, Drei, and procedural GLSL (no external image assets).

## Challenge

[NASA's Discarded Equipment Storytelling](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)

## NASA data sources used

- [Catalogue of Manmade Material on the Moon](https://www.nasa.gov/wp-content/uploads/2024/02/final-catalogue-of-manmade-material-on-the-moon.pdf)
- [NSSDCA Master Catalog](https://nssdc.gsfc.nasa.gov/nmc/)
- [LROC Image Archive](https://lroc.im-ldi.com/images)
- [Apollo Lunar Surface Journal](https://www.nasa.gov/history/alsj-and-afj/)
- [HiRISE / MRO](https://hirise-pds.lpl.arizona.edu/PDS/)
- [Apollo ALSEP / PDS Geosciences](https://pds-geosciences.wustl.edu/missions/apollo/)

Coordinates for lunar sites follow LROC Mean Earth / Polar Axis solutions.

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

1. **Preloader** — scramble decode + mission log  
2. **Hero** — WebGL Moon / Mars / debris / starfield  
3. **Prologue** — pinned scroll narrative  
4. **Fleet** — horizontal dossier cards (15 artifacts)  
5. **Archive** — filterable grid  
6. **Moon map** — interactive nearside beacons  
7. **Timeline** — 24 mission beacons  
8. **Voices** — six archival quotes  
9. **Stats** — odometer metrics  
10. **Deep space** — Pioneer 10 probe + live AU counter  
11. **Footer** — Space Apps attribution + UTC clock  

## AI disclosure

Visuals are procedural (shaders / SVG / CSS). Application code was AI-assisted and is disclosed per NASA Space Apps 2026 guidelines. No NASA logos or branding marks are generated or modified.

## Stack

React 19 · Vite · Framer Motion · Three.js · @react-three/fiber · @react-three/drei · Fontsource (Syne, Space Grotesk, IBM Plex Mono, Unbounded)

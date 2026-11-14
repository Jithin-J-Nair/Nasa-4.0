# SILENT FLEET

**Abandoned but not Forgotten** — NASA Space Apps Challenge 2026

A scroll-driven **film continuum**: one WebGL world that owns the story through crater dive → dust storm → carrier lost — so school-age explorers leave with a personal connection to NASA’s forgotten hardware and the science it made possible.

## Challenge objective

[NASA's Discarded Equipment Storytelling](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)

Accuracy throughout. Connection over scrap lists.

## Craft

- **Directed acts** (`src/world/film.js`) — holds, smash cuts, darkness / fog as punctuation
- **Scene events** — crater bowl you enter · Meridiani dust sheets · Pioneer signal beam that dies
- **Material system** — albedo + height AO/roughness + GGX + ASC-CDL grade
- **Diegetic captions** — story rides the continuum; recover dossiers from the beat
- **Scored silence** — Opportunity death and carrier lost are narrative audio, not a bed
- **One timeline** — Hero → continuum → three heartbeats → footer (no secondary site)
- **NASA SVS CGI Moon Kit** — 4K LROC + LOLA height

## Run

```bash
npm install
npm run dev   # port 3847
npm run build && npm run preview
```

## Journey

1. Hero — brand  
2. Film continuum — Moon → dive → Mars → storm → Pioneer (the world *is* the story)  
3. Recover — three named heartbeats open dossiers  
4. Footer — NASA resources  

## Sources

NSSDCA · LROC · [SVS 4720](https://svs.gsfc.nasa.gov/4720/) · ALSJ · HiRISE · PDS · Catalogue of Manmade Material on the Moon  

See `public/textures/ATTRIBUTION.txt`.

## AI disclosure

Code AI-assisted per Space Apps guidelines. Textures are NASA public products.

## Stack

React 19 · Vite · Framer Motion · Lenis · Three · R3F · Drei · postprocessing · Fontsource

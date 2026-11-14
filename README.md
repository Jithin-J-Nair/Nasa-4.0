# SILENT FLEET

**Abandoned but not Forgotten** — NASA Space Apps Challenge 2026

A scroll-driven **film continuum**: one WebGL world that owns the story through crater dive → dust storm → carrier lost — so school-age explorers leave with a personal connection to NASA’s forgotten hardware and the science it made possible.

## Challenge objective

[NASA's Discarded Equipment Storytelling](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)

Accuracy throughout. Connection over scrap lists.

## Craft

- **Film director** (`src/world/film.js`) — act holds, smash cuts, owned easings (not a scrubber)
- **Signature transitions** — crater dive · Meridiani dust storm · carrier-lost rings
- **Diegetic captions** — story text rides the continuum; dossiers are secondary
- **Cinematic grade** — ASC-CDL lift/gain per act + exposure storytelling
- **Narrative audio** — storm swell, signal dropout, UI ticks (tap **AUDIO**)
- **Inertia pointer** — weighted mouse, adaptive DPR under storm/dive
- **NASA SVS CGI Moon Kit** — 4K LROC + LOLA height

## Run

```bash
npm install
npm run dev   # port 3847
npm run build && npm run preview
```

## Journey

1. Hero — brand  
2. Film continuum — Moon → dive → Mars → storm → Pioneer  
3. Diegetic dossier strip — open heartbeats  
4. Archive / Moon map / Voices / Deep — accuracy tools  
5. Footer — NASA resources  

## Sources

NSSDCA · LROC · [SVS 4720](https://svs.gsfc.nasa.gov/4720/) · ALSJ · HiRISE · PDS · Catalogue of Manmade Material on the Moon  

See `public/textures/ATTRIBUTION.txt`.

## AI disclosure

Code AI-assisted per Space Apps guidelines. Textures are NASA public products.

## Stack

React 19 · Vite · Framer Motion · Lenis · Three · R3F · Drei · postprocessing · Fontsource

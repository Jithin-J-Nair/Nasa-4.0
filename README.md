# SILENT FLEET

**Abandoned but not Forgotten** — NASA Space Apps Challenge 2026

A scroll-driven **film continuum**: one WebGL world that owns the story through crater dive → dust storm → carrier lost — so school-age explorers leave with a personal connection to NASA’s forgotten hardware and the science it made possible.

## Challenge objective

[NASA's Discarded Equipment Storytelling](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)

Accuracy throughout. Connection over scrap lists.

## Art direction

- **Thesis:** Abandoned hardware as a touchable scroll-film — silence as material  
- **Hero:** Brand left · LROC Moon stage-right  
- **Type:** Syne / Unbounded at exaggerated display sizes; IBM Plex Mono for telemetry  
- **Motion stack:** GSAP + ScrollTrigger + Lenis (sole smooth-scroll engine)  
- **UI bits:** Curated [React Bits](https://www.reactbits.dev/) (JS) — Magnet, SpotlightCard, ClickSpark, FadeContent, GradientText, GlareHover, BlurText, TrueFocus, Noise, ShinyText, DecryptedText  
- **WebGL:** Justified continuum — albedo/AO/roughness planets, Fresnel atmosphere, diegetic scene events  
- **Assets:** 8K equirect Moon + Mars albedo masters (desktop) with derived height/bump LODs — see `public/textures/ATTRIBUTION.txt`

## Craft

- Directed acts with holds, smash, darkness / fog punctuation  
- Scene events — crater bowl · Meridiani dust sheets · Pioneer signal beam  
- GSAP boot + hero stagger; session-seeded timing variance on reload  
- React Bits hero (BlurText + GradientText + DecryptedText + ShinyText scroll cue), ClickSpark field, Magnet/Glare CTA  
- Objective TrueFocus + SpotlightCard; film grain via Noise; Atlas/footer decrypt + FadeContent  

- Cursor trail + magnetic CTA; diegetic captions open dossiers  
- Scored silence for Opportunity death and carrier lost  

## Run

```bash
npm install
npm run dev   # port 3847
npm run build && npm run preview
```

## Journey

1. Hero — motto **Abandoned but not Forgotten** + NASA leftover image (Eagle LM)  
2. Objective — Space Apps discarded-equipment storytelling brief  
3. Continuum — dive → Mars → storm → Pioneer  
4. Recover — three heartbeats with NASA photos  
5. Fleet / Archive — full leftover gallery + filters  
6. Footer — NASA resources  

## AI disclosure

Code AI-assisted per Space Apps guidelines. Textures are NASA public products.

## Stack

React 19 · Vite · GSAP · ScrollTrigger · Lenis · Framer Motion / Motion · React Bits (vendored) · Three · R3F · Drei · postprocessing · Fontsource

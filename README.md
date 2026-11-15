# Silent Fleet

**Abandoned but not Forgotten** · A NASA Space Apps Challenge 2026 project

Silent Fleet turns abandoned spacecraft into a scroll-driven story about the science they made
possible. Travel through an interactive 3D continuum from the Moon to Mars and deep space, explore
where selected hardware remains, and open mission dossiers with sourced context and clearly labeled
creative monologues.

> **Project status:** The app runs locally. A public deployment, demo video, measured audience impact,
> and formal scientific validation are not documented in this repository.

## 🚀 Overview

Silent Fleet is a single-page interactive experience for NASA Space Apps Challenge 2026. Its central
idea is simple: mission hardware left behind is more than debris—it is a record of exploration,
engineering, and discovery.

## 🌎 The Challenge

- **Thesis:** Abandoned hardware as a touchable scroll-film — silence as material  
- **Hero:** Brand left · LROC Moon stage-right  
- **Type:** Syne / Unbounded at exaggerated display sizes; IBM Plex Mono for telemetry  
- **Motion stack:** GSAP + ScrollTrigger + Lenis (sole smooth-scroll engine)  
- **UI bits:** Curated [React Bits](https://www.reactbits.dev/) (JS) — Magnet, SpotlightCard, ClickSpark, FadeContent, GradientText, GlareHover, BlurText, TrueFocus, Noise, ShinyText, DecryptedText, TiltedCard, DecayCard  
- **WebGL:** Justified continuum — albedo/AO/roughness planets, Fresnel atmosphere, diegetic scene events  
- **Assets:** 8K equirect Moon + Mars albedo masters (desktop) with derived height/bump LODs — see `public/textures/ATTRIBUTION.txt`

## 💡 Solution

- Directed acts with holds, smash, darkness / fog punctuation  
- Scene events — crater bowl · Meridiani dust sheets · Pioneer signal beam  
- GSAP boot + hero stagger; session-seeded timing variance on reload  
- React Bits hero (BlurText + GradientText + DecryptedText + ShinyText scroll cue), ClickSpark field, Magnet/Glare CTA  
- Objective TrueFocus + DecayCard (Aldrin portrait); film grain via Noise; Atlas/footer decrypt + FadeContent  

- Cursor trail + magnetic CTA; diegetic captions open dossiers  
- Scored silence for Opportunity death and carrier lost  
- Score beds: NASA EMFISIS chorus × Cassini Saturn radio (crossfaded) — see `public/audio/ATTRIBUTION.txt`
- Silence coda: NASA Pale Blue Dot Revisited still + interactive Earth hotspot — see `public/images/ATTRIBUTION.txt`  


## ✨ Features

- **A cinematic scroll journey** with authored Moon, transit, Mars, dust-storm, and deep-space story beats.
- **Interactive location views** with lunar and Martian site markers, selectable locations, and mission imagery.
- **Mission dossiers** with coordinates, mission context, source links, and creative monologues. The
  app labels these monologues as creative text, not archival recordings.
- **A browsable hardware shelf** with Moon, Mars, and deep-space filters.
- **Optional sound** using bundled NASA space-sound recordings, plus browser text-to-speech for dossier reading.
- **A Voyager 1 light-day countdown** tied to the NASA source and target time encoded in the
  project: 18 November 2026 at 10:16:07 UTC.

## 🛰 NASA Relevance

The project responds to the NASA Space Apps storytelling challenge and links to NASA mission, image,
and science references, including NSSDCA, LROC, the Apollo Lunar Surface Journal, HiRISE, and the
Planetary Data System.

The repository does not establish NASA affiliation, sponsorship, or endorsement. NASA's own
non-endorsement notice is included in the application. Individual NASA and third-party media remain
subject to their own attribution and usage guidance.

## 📸 Screenshots

Captured from the running local application. These five views show the landing experience, challenge
framing, location atlas, archive, and Voyager 1 dossier.

| Landing experience | Challenge framing |
|:--:|:--:|
| ![Landing page with the 3D Moon][home] | ![Apollo 11 challenge view][objective] |

| Location atlas | Mission archive |
|:--:|:--:|
| ![Lunar location atlas with selected dossier][atlas] | ![Archive with Opportunity Rover selected][archive] |

![Voyager 1 dossier showing its spacecraft image and creative monologue][voyager]

[home]: docs/screenshots/silent-fleet-home.png
[objective]: docs/screenshots/silent-fleet-objective.png
[atlas]: docs/screenshots/silent-fleet-atlas.png
[archive]: docs/screenshots/silent-fleet-archive.png
[voyager]: docs/screenshots/silent-fleet-voyager-1.png

## 🎥 Demo

**Demo Video — YouTube link:** _Paste your YouTube URL here._

No video file or hosted demo link is currently included in the repository. A public live-app URL is
not documented or verified. To run the app locally, follow [Local Setup](#-local-setup).

## 🏗 Architecture

```text
Vite entry (src/main.jsx)
└── React experience (src/App.jsx)
    ├── GSAP + ScrollTrigger + Lenis → scroll position and film progression
    ├── Film acts and geographic helpers (src/world/)
    ├── Three.js / React Three Fiber → Moon and Mars scene
    ├── Static mission records and references (src/data/artifacts.js)
    ├── Lazy-loaded archive and dossier UI (src/fleet/)
    └── Web Audio + browser speech synthesis → optional audio
```

Mission records and NASA resource links are stored in source files; there is no application backend
or mission-data API configured. Planet textures and sound files are bundled under `public`. Mission
images are referenced by external source URLs.

## 🛠 Technology Stack

## AI / SI disclosure (Space Apps 2026)

- **Code:** Written and refactored with AI assistance (Cursor agents / large language models). No AI-generated NASA logos or mission marks.
- **Visuals:** Planet globes are real NASA-referenced textures + procedural WebGL shaders (not generative AI images). Artifact stills are unaltered NASA photographs with on-screen credits.
- **Audio:** NASA historical mission recordings (EMFISIS chorus · Cassini Saturn radio), not AI-generated audio.
- **In-app notice:** Persistent `AI-ASSISTED · NASA SPACE APPS 2026` disclosure chip.
- **Submission:** Repeat this disclosure (and name specific tools) on the Space Apps project page.

## Compliance notes

- Challenge: [Abandoned but not Forgotten](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)
- Qualifying NASA Resource used: **NSSDCA** (coordinates / resting places) + Moon catalogue / LROC / images.nasa.gov
- Original code: Apache-2.0 (`LICENSE`) · third-party list: `THIRD_PARTY_LICENSES.md`
- No NASA meatball/worm logo; no endorsement implied

The project's intended impact is educational storytelling: make the history and science connected to
mission remains more engaging to explore. No user analytics, learning assessment, reach metrics, or
measured impact results are included, so outcomes are **not verified**.

## 🔬 Scientific Value

The mission records connect selected spacecraft to reported mission outcomes, instruments, locations,
and NASA reference material. The app presents this information as educational context; it is not a
scientific instrument, data-analysis tool, or independently validated model.

The Moon and Mars textures are visual maps from Solar System Scope / INOVE, not primary scientific
datasets. Their attribution file notes that the source maps include tuned colors and may use fictional
terrain to fill unmapped areas. The application labels its dossier voice text as creative monologue,
not a recording.

## 🔮 Future Roadmap

No formal roadmap or committed future milestones are documented in the repository. Future plans are
**not verified**.

## ⚡ Local Setup

**Prerequisite:** Node.js 22 (the repository's build workflow uses Node.js 22) and npm.

```bash
npm ci
npm run dev
```

Vite serves the app on <http://localhost:3847> by default. To create and preview a production build:

```bash
npm run build
npm run preview
```

## 🚀 Deployment

The GitHub Actions workflow at `.github/workflows/build.yml` installs locked dependencies and builds
the site on pushes and pull requests targeting `main`. It does not publish or deploy the app. No
hosting provider, production URL, or deployment workflow is configured in the repository.

## 👥 Team

No team roster or contributor roles are documented. The `LICENSE` file names Jithin J Nair as the
copyright holder; this alone does not establish a complete team list or NASA affiliation.

## 📜 License

The repository code is released under the [MIT License](LICENSE). Third-party media has separate terms
and credits: the Moon and Mars textures are attributed under CC BY 4.0 in
[`public/textures/ATTRIBUTION.txt`](public/textures/ATTRIBUTION.txt), and the Voyager model credit is
in [`public/models/ATTRIBUTION.txt`](public/models/ATTRIBUTION.txt). NASA images and audio include
source and credit information in the application; follow the applicable NASA media guidance and any
third-party source terms. NASA does not endorse this project.

## Sources & Attributions

### NASA data, mission records, and challenge references

- [NASA Catalogue of Manmade Material on the Moon](https://www.nasa.gov/wp-content/uploads/2024/02/final-catalogue-of-manmade-material-on-the-moon.pdf)
- [NSSDCA Master Catalog](https://nssdc.gsfc.nasa.gov/nmc/)
- [NSSDCA Apollo Lunar Module](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C)
- [NSSDCA Lunar Roving Vehicle](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C)
- [NSSDCA ALSEP](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C)
- [NSSDCA Lunar landing sites](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html)
- [LROC Featured Sites](https://lroc.im-ldi.com/images)
- [Apollo Lunar Surface Journal](https://www.nasa.gov/history/alsj-and-afj/)
- [PDS Geosciences Node Apollo data](https://pds-geosciences.wustl.edu/missions/apollo/)
- [HiRISE / Mars Reconnaissance Orbiter](https://hirise.lpl.arizona.edu/)
- [NASA Surveyor 3](https://science.nasa.gov/mission/surveyor-3/)
- [NASA Mars Pathfinder / Sojourner](https://science.nasa.gov/mission/mars-pathfinder/)
- [NASA Spirit and Opportunity](https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/)
- [NASA Viking 1](https://science.nasa.gov/mission/viking-1/)
- [NASA Viking 2](https://science.nasa.gov/mission/viking-2/)
- [NASA Phoenix](https://science.nasa.gov/mission/phoenix/)
- [NASA InSight](https://science.nasa.gov/mission/insight/)
- [NASA Dawn](https://science.nasa.gov/mission/dawn/)
- [NASA NEAR Shoemaker](https://science.nasa.gov/mission/near-shoemaker/)
- [NASA Pioneer 10 and 11](https://science.nasa.gov/mission/pioneer-10/)
- [NASA Ingenuity](https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/)
- [NASA Kepler](https://science.nasa.gov/mission/kepler/)
- [NASA Voyager 1 light-day reference](https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/)
- [NASA Voyager 3D model (VTAD)](https://science.nasa.gov/resource/voyager-3d-model/)
- [NASA Historical Sounds](https://www.nasa.gov/historical-sounds/)
- [NASA electron-whistle sound reference](https://www.nasa.gov/missions/mms/nasa-listens-in-as-electrons-whistle-while-they-work/)
- [NASA Space Apps challenge details](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details)
- [NASA Space Apps provided resources](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=resources)
- [NASA Images and Video Library](https://images.nasa.gov/)
- [NASA CGI Moon Kit (SVS 4720)](https://svs.gsfc.nasa.gov/4720/)
- [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [Space Apps legal notice](https://www.spaceappschallenge.org/legal/)

### NASA image records used by the app

[Apollo 11](https://images.nasa.gov/details/as11-40-5903), [Apollo 12 ALSEP](https://images.nasa.gov/details/as12-47-6919), [Surveyor 3](https://images.nasa.gov/details/as12-48-7121), [Apollo 14](https://images.nasa.gov/details/as14-64-9140), [Apollo 15](https://images.nasa.gov/details/as15-86-11603), [Apollo 16](https://images.nasa.gov/details/as16-115-18559), [Apollo 17](https://images.nasa.gov/details/as17-137-20979), [Apollo 11 ascent](https://images.nasa.gov/details/as11-40-5948), [Mars Pathfinder](https://images.nasa.gov/details/PIA16442), [Mars rover](https://images.nasa.gov/details/PIA17759), [Phoenix](https://images.nasa.gov/details/PIA22876), [Viking](https://images.nasa.gov/details/PIA01122), [Pioneer](https://images.nasa.gov/details/ARC-1972-AC72-2135), [Voyager](https://images.nasa.gov/details/PIA17462), and [Kepler](https://images.nasa.gov/details/PIA11824).

Additional item-specific image and location records are listed with each mission in [`src/data/artifacts.js`](src/data/artifacts.js).

### Other media and code

- Moon and Mars source maps: [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The 8K source maps are retained; runtime LOD copies and luminance-derived height/bump maps are adaptations.
- Ambient sound: [Van Allen Probes EMFISIS chorus](https://www.nasa.gov/wp-content/uploads/2015/01/693857main_emfisis_chorus_1.mp3) and [Cassini Saturn radio emissions](https://www.nasa.gov/wp-content/uploads/2015/01/584791main_spookysaturn.mp3), credited in [`public/audio/ATTRIBUTION.txt`](public/audio/ATTRIBUTION.txt). Playback is opt-in.
- Interface components: [React Bits](https://www.reactbits.dev/get-started/introduction).
- Third-party dependency terms: [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).
- [Project per-mission image and source index](https://github.com/Jithin-J-Nair/Nasa-4.0/blob/main/src/data/artifacts.js).

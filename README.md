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

The project is built around [NASA Space Apps Challenge 2026: NASA's Discarded Equipment
Storytelling](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/?tab=details).
The experience connects selected lunar, Martian, and deep-space mission remains to the work and
science associated with them.

## 💡 Solution

A continuous, scroll-directed film moves through a WebGL-rendered Moon and Mars, then into a
deep-space sequence. A coordinate-based atlas and a browsable archive let visitors pause the story,
inspect selected mission locations, and read more about each spacecraft.

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

- **App and build:** React 19, Vite
- **3D scene:** Three.js, React Three Fiber, Drei, React Three Postprocessing
- **Scroll and animation:** GSAP, ScrollTrigger, Lenis, Framer Motion
- **Audio:** Web Audio API and browser speech synthesis
- **Typography:** Fontsource packages for Syne, Space Grotesk, IBM Plex Mono, and Unbounded
- **Quality checks:** Oxlint; GitHub Actions production-build workflow

## 📊 Impact

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

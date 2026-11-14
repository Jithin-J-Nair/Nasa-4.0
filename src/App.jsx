/* eslint-disable react-hooks/exhaustive-deps, react/no-unknown-property */
/**
 * SILENT FLEET — Abandoned but not Forgotten
 * NASA Space Apps Challenge 2026 · Awwwards SOTY Edition
 * Single-file experience: React · Framer Motion · R3F · Drei · Three
 * Sources: NASA Catalogue of Manmade Material on the Moon, NSSDCA, LROC, ALSJ, HiRISE, PDS
 * AI-assisted code generation disclosed per Space Apps guidelines.
 */
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, createContext, useContext, Component } from 'react'
import { createPortal } from 'react-dom'
import {
  motion, AnimatePresence, useScroll, useSpring, useTransform, useMotionValue,
  useInView, useVelocity, animate, useReducedMotion,
} from 'framer-motion'
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

import '@fontsource/syne/700.css'
import '@fontsource/syne/800.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/unbounded/600.css'
import '@fontsource/unbounded/700.css'

/* ═══════════════════════════════════════════════════════════
   DATA — 15 artifacts · 24 timeline · 6 voices · moon pins
   Verified against NSSDCA / LROC / NASA Catalogue (2012/2024)
   ═══════════════════════════════════════════════════════════ */

const EASE = [0.16, 1, 0.3, 1]
const SPRING = { stiffness: 180, damping: 28, mass: 0.8 }
const SPRING_SOFT = { stiffness: 120, damping: 26 }
const SPRING_SNAP = { stiffness: 260, damping: 34 }

const ARTIFACTS = [
  {
    id: 'a11-lm', body: 'moon', status: 'SILENT', year: 1969, mission: 'Apollo 11',
    name: 'Eagle Descent Stage',
    codename: 'TRANQUILITY BASE',
    coords: '0.67416° N, 23.47314° E', lat: 0.67416, lon: 23.47314,
    mass: '2,034 kg residual', duration: '21 h 36 m on surface',
    science: 'First crewed landing. LRRR still returns Earth laser ranging; PSE recorded the first lunar seismic events.',
    story: 'On 20 July 1969 the descent stage of Lunar Module Eagle became humanity\'s first permanent outpost on another world. When Armstrong and Aldrin lifted away, they left behind the stage, the laser ranging retroreflector, and a seismometer that listened to the Moon for three weeks. LROC still photographs the bright landing site — a scar of bootprints and discarded ascent equipment that will outlast every city on Earth.',
    transmission: 'TRANQUILITY BASE HERE. THE EAGLE HAS LANDED.',
    tags: ['LANDER', 'LRRR', 'FIRST'],
    color: '#c4cdd8',
  },
  {
    id: 'a12-alsep', body: 'moon', status: 'SILENT', year: 1969, mission: 'Apollo 12',
    name: 'ALSEP Central Station',
    codename: 'OCEAN OF STORMS',
    coords: '3.0098° S, 23.4249° W', lat: -3.0098, lon: -23.4249,
    mass: '~300 kg package', duration: 'Until Sept 1977 shutdown',
    science: 'Passive seismometer, solar wind spectrometer, magnetometer, and suprathermal ion detector ran for nearly eight years.',
    story: 'Conrad and Bean walked to Surveyor 3, then planted the first complete Apollo Lunar Surface Experiments Package. For almost a decade the ALSEP network — later joined by later crews — mapped moonquakes and the tenuous lunar atmosphere. NASA powered the stations down in 1977. The central stations still stand, silver panels dulled by micrometeorites.',
    transmission: 'ALSEP A12 · LAST CARRIER · 30 SEP 1977',
    tags: ['ALSEP', 'SEISMOLOGY'],
    color: '#c4cdd8',
  },
  {
    id: 'surveyor3', body: 'moon', status: 'SILENT', year: 1967, mission: 'Surveyor 3',
    name: 'Surveyor 3 Lander',
    codename: 'VISITED BY APOLLO 12',
    coords: '3.0162° S, 23.4180° W', lat: -3.0162, lon: -23.418,
    mass: '296 kg landed', duration: 'Soft-landed 20 Apr 1967',
    science: 'Soil mechanics scoop; television verified mare bearing strength for Apollo. Returned camera parts analyzed Earth-side.',
    story: 'Surveyor 3 proved soft landing was possible in Oceanus Procellarum. Thirty-one months later Apollo 12 set down 180 meters away. Astronauts cut the television camera and scoop from the lander — the only time humans have visited a robotic craft on another world. The stripped chassis still waits beside its own landing scars.',
    transmission: 'SURVEYOR 3 · CONTACT CONFIRMED · 1967-04-20',
    tags: ['ROBOTIC', 'SAMPLE'],
    color: '#a8b4c0',
  },
  {
    id: 'a14-alsep', body: 'moon', status: 'SILENT', year: 1971, mission: 'Apollo 14',
    name: 'ALSEP & MET Cart',
    codename: 'FRA MAURO',
    coords: '3.64419° S, 17.47768° W', lat: -3.64419, lon: -17.47768,
    mass: 'ALSEP + MET ~100 kg', duration: 'Science until 1977',
    science: 'Active seismic experiment mapped shallow crust; charged-particle detectors studied the lunar wake.',
    story: 'Shepard and Mitchell hauled the Modular Equipment Transporter — a rickshaw of geology tools — across Fra Mauro\'s ejecta blanket. The ALSEP they left fired mortar charges into the regolith, listening for echoes that still inform models of the Moon\'s fractured crust. Golf balls from Shepard\'s famous swing remain somewhere nearby.',
    transmission: 'FRA MAURO · ACTIVE SEISMIC · MORTAR FIRED',
    tags: ['ALSEP', 'GEOLOGY'],
    color: '#c4cdd8',
  },
  {
    id: 'a15-lrv', body: 'moon', status: 'SILENT', year: 1971, mission: 'Apollo 15',
    name: 'Lunar Roving Vehicle',
    codename: 'HADLEY–APENNINE',
    coords: '26.13174° N, 3.63803° E', lat: 26.13174, lon: 3.63803,
    mass: '210 kg rover', duration: '27.9 km traversed',
    science: 'Enabled sampling of Hadley Rille and Apennine front; LRV TV broadcast geology live to Earth.',
    story: 'The first lunar car rests tilted near the Hadley Rille rim, its wire-mesh wheels frozen mid-track. Scott and Irwin drove 28 kilometers through the Apennine mountains, returning 77 kg of rock — including the Genesis Rock, nearly as old as the solar system. LROC resolves the rover, the LM, and the long white tracks that still cut the dust.',
    transmission: 'ROVER 1 · HADLEY · FINAL PARK',
    tags: ['ROVER', 'LRV'],
    color: '#d0d8e0',
  },
  {
    id: 'a16-lrv', body: 'moon', status: 'SILENT', year: 1972, mission: 'Apollo 16',
    name: 'Lunar Roving Vehicle',
    codename: 'DESCARTES HIGHLANDS',
    coords: '8.9729° S, 15.5037° E', lat: -8.9729, lon: 15.5037,
    mass: '210 kg rover', duration: '26.7 km traversed',
    science: 'Proved Descartes was not volcanic; returned highland anorthosite and the largest lunar rock sample.',
    story: 'Young and Duke parked their rover at Descartes after three days exploring bright highland terrain. The mission shattered the volcanic-dome hypothesis and brought home Big Muley — 11.7 kg of impact breccia. Cosmic-ray detectors left on the surface recorded solar particle events until the ALSEP network went dark.',
    transmission: 'DESCARTES · HIGHLAND SURVEY COMPLETE',
    tags: ['ROVER', 'HIGHLANDS'],
    color: '#d0d8e0',
  },
  {
    id: 'a17-lrv', body: 'moon', status: 'SILENT', year: 1972, mission: 'Apollo 17',
    name: 'Lunar Roving Vehicle + ALSEP',
    codename: 'TAURUS–LITTROW',
    coords: '20.1896° N, 30.7769° E', lat: 20.1896, lon: 30.7769,
    mass: 'LRV 210 kg · ALSEP ~300 kg', duration: '35.7 km · last crewed departure',
    science: 'Heat-flow probes measured interior temperature; orange volcanic glass revealed ancient fire-fountains.',
    story: 'Cernan and Schmitt left the last bootprints. Their rover sits at Taurus-Littrow with a plaque reading "Here Man completed his first explorations of the Moon." The ALSEP heat-flow experiment ran until 1977, giving the only direct temperature profile of the lunar interior. Orange soil from Shorty Crater still stains the sample bags in Houston.',
    transmission: 'TAURUS-LITTROW · WE LEAVE AS WE CAME · IN PEACE',
    tags: ['ROVER', 'LAST CREWED', 'ALSEP'],
    color: '#e8eef5',
  },
  {
    id: 'a11-lrrr', body: 'moon', status: 'ACTIVE', year: 1969, mission: 'Apollo 11/14/15',
    name: 'Laser Ranging Retroreflectors',
    codename: 'STILL ANSWERING',
    coords: '0.67345° N, 23.47307° E', lat: 0.67345, lon: 23.47307,
    mass: 'Array panels ~3–20 kg', duration: 'Ongoing since 1969',
    science: 'Millimeter-precision Earth–Moon ranging; tests general relativity and lunar orbital dynamics.',
    story: 'Three Apollo arrays and two Soviet Lunokhod panels still bounce laser pulses from Earth observatories. They are the only Apollo experiments that never needed power — mirrors waiting in vacuum. Every clear night, photons leave New Mexico or Grasse, cross 384,000 km, and return with a timestamp that maps the Moon\'s slow drift.',
    transmission: 'LRRR · PULSE RETURN · Δt ≈ 2.5 s',
    tags: ['ACTIVE', 'LRRR', 'PHYSICS'],
    color: '#8ec8ff',
  },
  {
    id: 'spirit', body: 'mars', status: 'SILENT', year: 2004, mission: 'MER-A Spirit',
    name: 'Spirit Rover',
    codename: 'GUSEV CRATER',
    coords: '14.5684° S, 175.4726° E', lat: -14.5684, lon: 175.4726,
    mass: '185 kg', duration: '6 y 2 m · 7.7 km',
    science: 'Confirmed ancient hydrothermal alteration; Columbia Hills revealed water-altered rocks.',
    story: 'Spirit was meant to last 90 sols. She climbed Husband Hill, survived dust storms, and became stuck in soft soil at Troy in 2009. Engineers tried every wheel dance they knew. The last whisper arrived 22 March 2010. HiRISE still finds her — a bright speck on the floor of Gusev, solar panels coated in rust-colored dust.',
    transmission: 'SPIRIT · SOL 2210 · NO SIGNAL',
    tags: ['ROVER', 'MER'],
    color: '#ff7a45',
  },
  {
    id: 'opportunity', body: 'mars', status: 'SILENT', year: 2004, mission: 'MER-B Opportunity',
    name: 'Opportunity Rover',
    codename: 'MERIDIANI PLANUM',
    coords: '2.2795° S, 5.5043° W', lat: -2.2795, lon: -5.5043,
    mass: '185 kg', duration: '14 y 138 d · 45.16 km',
    science: 'Hematite blueberries proved long-lived surface water; Endeavour rim mapped Noachian clay.',
    story: 'Opportunity rolled farther than any extraterrestrial rover in history — a marathon across Meridiani\'s etched plains. She found evidence of ancient acidic lakes, wintered in Victoria Crater, and climbed into Endeavour. A global dust storm in 2018 blocked her sun. NASA declared the mission complete after more than a thousand recovery commands went unanswered.',
    transmission: 'MY BATTERY IS LOW AND IT\'S GETTING DARK',
    tags: ['ROVER', 'RECORD'],
    color: '#ff7a45',
  },
  {
    id: 'phoenix', body: 'mars', status: 'SILENT', year: 2008, mission: 'Phoenix',
    name: 'Phoenix Lander',
    codename: 'VASTITAS BOREALIS',
    coords: '68.2188° N, 125.7492° W', lat: 68.2188, lon: -125.7492,
    mass: '350 kg landed', duration: '157 sols',
    science: 'Directly sampled water ice; perchlorates and alkaline soil reshaped habitability models.',
    story: 'Phoenix dug into the northern polar plains and found water ice glittering under a few centimeters of soil — confirmation of what orbital spectrometers had hinted. Wet chemistry cells tasted perchlorate salts. As winter darkness and CO₂ frost closed in, the lander went silent. Its outstretched arm and discarded heat shield still mark the arctic site.',
    transmission: 'PHOENIX · ICE CONFIRMED · 2008-06-19',
    tags: ['LANDER', 'ICE'],
    color: '#e07040',
  },
  {
    id: 'insight', body: 'mars', status: 'SILENT', year: 2018, mission: 'InSight',
    name: 'InSight Lander',
    codename: 'ELYSIUM PLANITIA',
    coords: '4.5024° N, 135.6234° E', lat: 4.5024, lon: 135.6234,
    mass: '358 kg landed', duration: '4 y 92 d',
    science: 'SEIS detected marsquakes; mapped crust, mantle, and core; weather station logged dust devil season.',
    story: 'InSight was a listening post — a seismometer so sensitive it heard the wind, lander clicks, and the deep ringing of marsquakes. It measured the size of Mars\' liquid core and the thickness of its crust. Dust slowly smothered the solar panels. On 15 December 2022 the last full session ended. The mole that never fully buried itself still leans beside the lander.',
    transmission: 'INSIGHT · SEIS · FINAL TELEMETRY · 2022-12-15',
    tags: ['LANDER', 'SEISMOLOGY'],
    color: '#ff7a45',
  },
  {
    id: 'sojourner', body: 'mars', status: 'SILENT', year: 1997, mission: 'Mars Pathfinder',
    name: 'Sojourner Rover',
    codename: 'ARESCIBO MEMORIAL STATION',
    coords: '19.13° N, 33.22° W', lat: 19.13, lon: -33.22,
    mass: '10.6 kg rover', duration: '83 sols · ~100 m',
    science: 'First successful Mars rover; APXS composition of rocks; validated airbag landing.',
    story: 'A microwave-sized rover named Sojourner rolled off Pathfinder\'s petal ramps and into history. She sniffed rocks named Barnacle Bill and Yogi while the lander\'s camera watched. Contact was lost in September 1997. Decades later, HiRISE resolved the lander, the scattered airbags, and the tiny rover a few meters away — still parked on the flood plain of Ares Vallis.',
    transmission: 'SOJOURNER · FIRST TRACKS · 1997-07-05',
    tags: ['ROVER', 'FIRST'],
    color: '#d4683a',
  },
  {
    id: 'pioneer10', body: 'deep', status: 'COASTING', year: 1972, mission: 'Pioneer 10',
    name: 'Pioneer 10',
    codename: 'FIRST PAST THE BELT',
    coords: 'Heliocentric · ~134+ AU outbound', lat: 0, lon: 0,
    mass: '258 kg', duration: 'Last signal 23 Jan 2003',
    science: 'First Jupiter flyby; mapped asteroid belt hazards; gold plaque carries Earth\'s greeting.',
    story: 'Pioneer 10 was the first spacecraft to cross the asteroid belt and the first to photograph Jupiter up close. After its planetary work, it kept going — a silent messenger on a trajectory toward Aldebaran in about two million years. The last faint telemetry arrived in 2003. Somewhere beyond the heliopause, the gold plaque still faces the dark.',
    transmission: 'PIONEER 10 · CARRIER LOST · STILL OUTBOUND',
    tags: ['PROBE', 'JUPITER', 'PLAQUE'],
    color: '#ffb347',
  },
  {
    id: 'voyager1', body: 'deep', status: 'ACTIVE', year: 1977, mission: 'Voyager 1',
    name: 'Voyager 1',
    codename: 'INTERSTELLAR MISSION',
    coords: 'Heliocentric · ~166 AU', lat: 0, lon: 0,
    mass: '815 kg', duration: 'Ongoing · Golden Record',
    science: 'First spacecraft in interstellar space; measured heliopause; Plasma Wave still returns data.',
    story: 'Voyager 1 left the heliosphere in 2012 and became the most distant human-made object. Its Golden Record carries greetings in 55 languages, whale song, and Chuck Berry. Power dwindles each year; engineers shut off instruments one by one. Yet the spacecraft still phones home across more than 24 light-hours — a heartbeat from the shore of another star\'s domain.',
    transmission: 'VOYAGER 1 · INTERSTELLAR · SIGNAL NOMINAL',
    tags: ['PROBE', 'ACTIVE', 'RECORD'],
    color: '#8ec8ff',
  },
]

const TIMELINE = [
  { year: '1958', title: 'Explorer 1', text: 'America\'s first satellite discovers the Van Allen belts — the opening act of a hardware diaspora.' },
  { year: '1966', title: 'Surveyor 1', text: 'First U.S. soft landing on the Moon. Oceanus Procellarum bears a new aluminum resident.' },
  { year: '1967', title: 'Surveyor 3', text: 'Soft-lands in the Ocean of Storms; later visited and partly salvaged by Apollo 12.' },
  { year: '1969', title: 'Apollo 11', text: 'Eagle descent stage, LRRR, and PSE left at Tranquility Base. Humanity\'s first permanent lunar outpost.' },
  { year: '1969', title: 'Apollo 12 ALSEP', text: 'First full experiments package begins nearly eight years of continuous lunar science.' },
  { year: '1971', title: 'Apollo 14', text: 'Fra Mauro ALSEP and MET cart expand the seismic network across the near side.' },
  { year: '1971', title: 'Apollo 15 LRV', text: 'First lunar rover parked at Hadley. Tracks remain readable from orbit.' },
  { year: '1972', title: 'Pioneer 10', text: 'Launches toward Jupiter — and then forever outward, carrying a gold plaque.' },
  { year: '1972', title: 'Apollo 16', text: 'Descartes highlands surveyed by LRV; volcanic-dome theory overturned.' },
  { year: '1972', title: 'Apollo 17', text: 'Last crewed departure from Taurus-Littrow. LRV and ALSEP remain.' },
  { year: '1973', title: 'Pioneer 11', text: 'Follows Pioneer 10; first to encounter Saturn, then exits the ecliptic plane.' },
  { year: '1976', title: 'Viking 1 & 2', text: 'First long-lived Mars landers. Chryse and Utopia still hold their silent frames.' },
  { year: '1977', title: 'ALSEP Shutdown', text: 'NASA powers down the lunar experiment network. Only LRRR arrays keep working.' },
  { year: '1977', title: 'Voyager 1 & 2', text: 'Grand Tour begins. Golden Records leave Earth for interstellar space.' },
  { year: '1997', title: 'Sojourner', text: 'First Mars rover rolls onto Ares Vallis. Pathfinder proves airbags and microrovers.' },
  { year: '2004', title: 'Spirit & Opportunity', text: 'Twin MERs begin what will become decades of geology across two hemispheres.' },
  { year: '2008', title: 'Phoenix', text: 'Polar lander digs water ice at Vastitas Borealis — ice you can see and touch.' },
  { year: '2010', title: 'Spirit Lost', text: 'Final contact. Stuck at Troy after 6 years and 7.7 kilometers.' },
  { year: '2012', title: 'Voyager 1 Heliosphere', text: 'Crosses into interstellar space — first human artifact among the stars.' },
  { year: '2018', title: 'Opportunity Lost', text: 'Global dust storm ends a 45-kilometer, 14-year marathon at Meridiani.' },
  { year: '2018', title: 'InSight Lands', text: 'SEIS begins listening to the red planet\'s deep interior at Elysium Planitia.' },
  { year: '2019', title: 'LROC Catalog', text: 'Orbital imagery resolves every Apollo site; anthropogenic catalogue refined.' },
  { year: '2022', title: 'InSight EOM', text: 'Dust ends the seismic mission. Core and crust maps endure in the archive.' },
  { year: '2026', title: 'Silent Fleet', text: 'Space Apps storytellers reopen the dossiers. The hardware is still out there.' },
]

const VOICES = [
  {
    id: 'v1', who: 'Neil Armstrong', role: 'Apollo 11 CDR',
    quote: 'That\'s one small step for a man, one giant leap for mankind.',
    file: 'ALSJ A11 · 109:24:23',
    context: 'First bootprint beside Eagle. The descent stage would never leave.',
  },
  {
    id: 'v2', who: 'Pete Conrad', role: 'Apollo 12 CDR',
    quote: 'Whoopie! Man, that may have been a small one for Neil, but that\'s a long one for me.',
    file: 'ALSJ A12 · 115:22:16',
    context: 'Landing beside Surveyor 3 — the first rendezvous with abandoned hardware.',
  },
  {
    id: 'v3', who: 'Gene Cernan', role: 'Apollo 17 CDR',
    quote: 'We leave as we came, and God willing, we shall return — with peace and hope for all mankind.',
    file: 'ALSJ A17 · 188:01:00',
    context: 'Last words from the lunar surface. The rover still faces Earth.',
  },
  {
    id: 'v4', who: 'Steve Squyres', role: 'MER PI',
    quote: 'Opportunity has died a hero\'s death. She made us all proud.',
    file: 'NASA Briefing · 2019-02-13',
    context: 'After 5,111 sols and unanswered recovery commands.',
  },
  {
    id: 'v5', who: 'Carl Sagan', role: 'Voyager Imaging',
    quote: 'The spacecraft will be encountered and the record played only if there are advanced space-faring civilizations in interstellar space.',
    file: 'Murmurs of Earth · 1978',
    context: 'On the Golden Record riding Voyager into the dark.',
  },
  {
    id: 'v6', who: 'Bruce Banerdt', role: 'InSight PI',
    quote: 'InSight\'s demise is due to dust — a constant presence on Mars — coating its solar panels.',
    file: 'JPL Release · 2022-12-21',
    context: 'Closing the only dedicated Mars seismology station.',
  },
]

const MOON_PINS = ARTIFACTS.filter(a => a.body === 'moon').map(a => ({
  id: a.id, name: a.name, mission: a.mission, lat: a.lat, lon: a.lon,
  status: a.status, coords: a.coords, note: a.codename,
}))

const STATS = [
  { id: 's1', label: 'Catalogued lunar items', value: 796, suffix: '', unit: 'NASA Catalogue', spark: [2,4,3,6,8,7,9,10] },
  { id: 's2', label: 'Apollo surface years', value: 8, suffix: '', unit: 'ALSEP network 1969–77', spark: [1,3,5,7,8,8,6,0] },
  { id: 's3', label: 'Opportunity distance', value: 45, suffix: ' km', unit: 'Meridiani marathon', spark: [1,4,8,12,20,30,40,45] },
  { id: 's4', label: 'Voyager 1 range', value: 166, suffix: ' AU', unit: 'Interstellar · climbing', spark: [10,40,80,110,130,145,155,166] },
  { id: 's5', label: 'LRRR pulse age', value: 57, suffix: ' yr', unit: 'Still reflecting lasers', spark: [1,10,20,30,40,50,55,57] },
  { id: 's6', label: 'Mars soft landers', value: 9, suffix: '+', unit: 'NASA surface assets', spark: [1,2,3,5,6,7,8,9] },
]

const MISSION_LOG = [
  'UPLINK · LROC NAC FRAME ACQUIRED',
  'DECODE · ALSEP ARCSAV TAPE BLOCK',
  'RANGE · LRRR Δt = 2.506441 s',
  'TELEMETRY · PIONEER 10 CARRIER NULL',
  'ARCHIVE · NSSDCA MASTER CATALOG',
  'HIRES · MRO HiRISE RDRV11 QUEUE',
  'VOICE · ALSJ TRANSCRIPT INDEXED',
  'FLEET · 15 DOSSIERS SEALED',
]

const MARQUEE_ITEMS = [
  'TRANQUILITY BASE', 'OCEAN OF STORMS', 'FRA MAURO', 'HADLEY RILLE', 'DESCARTES',
  'TAURUS-LITTROW', 'GUSEV CRATER', 'MERIDIANI PLANUM', 'ELYSIUM PLANITIA',
  'VASTITAS BOREALIS', 'ARES VALLIS', 'HELIOPAUSE', 'INTERSTELLAR MEDIUM',
  'GOLDEN RECORD', 'LASER RETURN', 'SILENT CARRIER',
]

const FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'moon', label: 'MOON' },
  { id: 'mars', label: 'MARS' },
  { id: 'deep', label: 'DEEP SPACE' },
  { id: 'active', label: 'STILL LIVE' },
]


/* ═══════════════════════════════════════════════════════════
   GLOBAL CSS — Glass 2.0 · HUD · typography · motion tokens
   ═══════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
:root {
  --bg: #07070c;
  --bg-elev: #0c0c14;
  --ink: #e8eef5;
  --ink-dim: #8b93a7;
  --ink-mute: #5c6478;
  --moon: #c4cdd8;
  --ice: #8ec8ff;
  --rust: #ff7a45;
  --rust-deep: #c44e28;
  --violet: #6b5cff;
  --gold: #ffb347;
  --line: rgba(232,238,245,0.12);
  --line-bright: rgba(232,238,245,0.28);
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --font-display: "Syne", "Unbounded", sans-serif;
  --font-body: "Space Grotesk", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --font-alt: "Unbounded", "Syne", sans-serif;
  --nav-h: 64px;
  --glass-0: rgba(12,12,20,0.35);
  --glass-1: rgba(14,14,24,0.45);
  --glass-2: rgba(16,16,28,0.55);
  --glass-3: rgba(18,18,32,0.68);
  --glass-4: rgba(10,10,18,0.82);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: auto; background: var(--bg); color: var(--ink); }
html, body, #root { min-height: 100%; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--ink);
  overflow-x: clip;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  cursor: none;
}
body.is-coarse { cursor: auto; }
body.is-coarse .sf-cursor { display: none !important; }
::selection { background: rgba(255,122,69,0.35); color: #fff; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: none; cursor: none; }
body.is-coarse button { cursor: pointer; }
img, svg { display: block; max-width: 100%; }
:focus-visible {
  outline: 2px solid var(--ice);
  outline-offset: 3px;
}
.sf-app {
  position: relative;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(110,90,255,0.08), transparent 55%),
    radial-gradient(ellipse 60% 40% at 80% 20%, rgba(255,122,69,0.05), transparent 50%),
    linear-gradient(180deg, #07070c 0%, #0a0a12 40%, #07070c 100%);
  overflow-x: clip;
}
.sf-app::before {
  content: "";
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 50;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}
.sf-grid-bg {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 0;
  opacity: 0.04;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 80px 80px;
  mask-image: radial-gradient(ellipse at center, #000 20%, transparent 75%);
}

/* Glass elevation system */
.glass-0,.glass-1,.glass-2,.glass-3,.glass-4 {
  position: relative;
  background: var(--glass-2);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid transparent;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 1px 0 0 rgba(255,255,255,0.08) inset,
    0 20px 50px -20px rgba(0,0,0,0.65),
    0 0 40px -10px rgba(142,200,255,0.06);
  isolation: isolate;
}
.glass-0 { background: var(--glass-0); }
.glass-1 { background: var(--glass-1); }
.glass-3 { background: var(--glass-3); }
.glass-4 { background: var(--glass-4); backdrop-filter: blur(28px) saturate(170%); }
.glass-0::before,.glass-1::before,.glass-2::before,.glass-3::before,.glass-4::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(from var(--foil-angle, 0deg), transparent 0%, rgba(142,200,255,0.45) 12%, transparent 28%, rgba(255,122,69,0.35) 48%, transparent 62%, rgba(107,92,255,0.4) 78%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.55;
  animation: foilSpin 12s linear infinite;
}
@keyframes foilSpin { to { --foil-angle: 360deg; } }
@property --foil-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
.holo-foil {
  position: relative;
  overflow: hidden;
}
.holo-foil::after {
  content: "";
  position: absolute;
  inset: -40%;
  background: conic-gradient(from 0deg, transparent, rgba(142,200,255,0.12), transparent, rgba(255,122,69,0.1), transparent, rgba(107,92,255,0.12), transparent);
  animation: foilSpin 12s linear infinite;
  pointer-events: none;
  mix-blend-mode: color-dodge;
  opacity: 0.5;
}

.scanlines::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px);
  opacity: 0.35;
  border-radius: inherit;
}
.blueprint-grid {
  background-image:
    linear-gradient(rgba(142,200,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(142,200,255,0.05) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 80%);
}
.corner-brackets { position: relative; }
.corner-brackets::before, .corner-brackets::after {
  content: "";
  position: absolute;
  width: 14px; height: 14px;
  border-color: var(--ice);
  border-style: solid;
  opacity: 0.55;
  transition: width 0.4s var(--ease), height 0.4s var(--ease), opacity 0.4s;
  pointer-events: none;
}
.corner-brackets::before { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
.corner-brackets::after { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }
.corner-brackets:hover::before, .corner-brackets:hover::after,
.corner-brackets:focus-within::before, .corner-brackets:focus-within::after {
  width: 22px; height: 22px; opacity: 0.9;
}

.kicker {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-dim);
}
.display {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.92;
}
.display-xl {
  font-size: clamp(3rem, 12vw, 11rem);
}
.outline-text {
  color: transparent;
  -webkit-text-stroke: 1.25px rgba(232,238,245,0.55);
}
.grad-text {
  background: linear-gradient(110deg, var(--ink) 20%, var(--ice) 45%, var(--rust) 70%, var(--ink) 90%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: gradDrift 9s ease-in-out infinite alternate;
}
@keyframes gradDrift {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}
.mono { font-family: var(--font-mono); }
.caret::after {
  content: "▋";
  margin-left: 2px;
  animation: blink 1s steps(1) infinite;
  color: var(--rust);
  font-size: 0.85em;
}
@keyframes blink { 50% { opacity: 0; } }

.section {
  position: relative;
  z-index: 2;
  padding: clamp(4rem, 10vw, 8rem) clamp(1.25rem, 4vw, 4rem);
}
.section-rail {
  position: absolute;
  left: clamp(0.5rem, 2vw, 1.5rem);
  top: 20%;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.3em;
  color: var(--ink-mute);
  opacity: 0.7;
  pointer-events: none;
}
.section-num {
  position: absolute;
  right: clamp(0.5rem, 3vw, 2rem);
  top: 8%;
  font-family: var(--font-display);
  font-size: clamp(4rem, 14vw, 12rem);
  font-weight: 800;
  color: rgba(232,238,245,0.03);
  line-height: 1;
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.06em;
}

.mag-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1.6rem;
  overflow: hidden;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--ink);
  isolation: isolate;
  transition: color 0.35s var(--ease);
}
.mag-btn .fill {
  position: absolute;
  inset: auto 0 0 0;
  height: 0%;
  background: var(--rust);
  z-index: -1;
  transition: height 0.45s var(--ease);
}
.mag-btn:hover .fill, .mag-btn:focus-visible .fill { height: 100%; }
.mag-btn:hover, .mag-btn:focus-visible { color: #fff; }
.mag-btn .arrow { transition: transform 0.35s var(--ease); display: inline-block; }
.mag-btn:hover .arrow { transform: translateX(4px) rotate(-20deg); }

.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--rust);
  box-shadow: 0 0 0 0 rgba(255,122,69,0.5);
  animation: sonar 2.4s ease-out infinite;
  display: inline-block;
}
.status-dot.live { background: var(--ice); box-shadow: 0 0 0 0 rgba(142,200,255,0.5); animation-name: sonarIce; }
.status-dot.coast { background: var(--gold); }
@keyframes sonar {
  0% { box-shadow: 0 0 0 0 rgba(255,122,69,0.45); }
  70% { box-shadow: 0 0 0 12px rgba(255,122,69,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,122,69,0); }
}
@keyframes sonarIce {
  0% { box-shadow: 0 0 0 0 rgba(142,200,255,0.45); }
  70% { box-shadow: 0 0 0 12px rgba(142,200,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(142,200,255,0); }
}

.hud-corners { position: relative; }
.hud-corners .hc {
  position: absolute; width: 18px; height: 18px;
  border: 1px solid rgba(142,200,255,0.45);
  opacity: 0.7;
}
.hud-corners .hc.tl { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
.hud-corners .hc.tr { top: -1px; right: -1px; border-left: 0; border-bottom: 0; }
.hud-corners .hc.bl { bottom: -1px; left: -1px; border-right: 0; border-top: 0; }
.hud-corners .hc.br { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }
.hud-corners .hc.blink { animation: blink 1.6s steps(1) infinite; }

.data-chip {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border-left: 2px solid var(--chip, var(--ice));
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--ink-dim);
}
.data-chip::before { content: "▸"; color: var(--chip, var(--ice)); opacity: 0.8; }

.sf-cursor {
  position: fixed; left: 0; top: 0; z-index: 10000;
  pointer-events: none; mix-blend-mode: difference;
  transform: translate(-50%, -50%);
}
.sf-cursor .dot {
  width: 6px; height: 6px; border-radius: 50%; background: #fff;
}
.sf-cursor .ring {
  position: absolute; left: 50%; top: 50%;
  width: 36px; height: 36px; margin: -18px 0 0 -18px;
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 50%;
}
.sf-cursor .label {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  white-space: nowrap;
  color: #fff;
  opacity: 0;
  scale: 0.8;
  transition: opacity 0.25s, scale 0.25s;
}
.sf-cursor.has-label .ring { opacity: 0; }
.sf-cursor.has-label .label { opacity: 1; scale: 1; }

.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(1rem, 3vw, 2.5rem);
  background: linear-gradient(to bottom, rgba(7,7,12,0.85), transparent);
  backdrop-filter: blur(12px) saturate(140%);
}
.nav-progress {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, var(--ice), var(--rust), var(--violet));
  box-shadow: 0 0 12px rgba(142,200,255,0.6);
  transform-origin: left;
}
.nav-brand {
  font-family: var(--font-alt);
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.2em;
}
.nav-links { display: flex; gap: 1.5rem; }
.nav-links a {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.16em;
  color: var(--ink-dim);
  transition: color 0.3s;
}
.nav-links a:hover, .nav-links a:focus-visible { color: var(--ink); }

.preloader {
  position: fixed; inset: 0; z-index: 1000;
  background: #050508;
  display: grid; place-items: center;
  overflow: hidden;
}
.preloader-panels {
  position: absolute; inset: 0; display: flex;
}
.preloader-panels span {
  flex: 1; background: #050508;
  transform-origin: top;
}

.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: calc(var(--nav-h) + 2rem) clamp(1.25rem, 4vw, 4rem) 4rem;
  overflow: clip;
}
.hero-canvas {
  position: absolute; inset: 0; z-index: 0;
}
.hero-content { position: relative; z-index: 2; max-width: 1200px; }
.hero-scroll-cue {
  position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.2em; color: var(--ink-mute);
}
.hero-scroll-cue .streak {
  width: 1px; height: 48px; overflow: hidden; position: relative;
  background: rgba(255,255,255,0.08);
}
.hero-scroll-cue .streak i {
  position: absolute; left: 0; width: 100%; height: 30%;
  background: linear-gradient(to bottom, transparent, var(--ice));
  animation: fallStreak 1.8s ease-in-out infinite;
}
@keyframes fallStreak {
  0% { top: -30%; opacity: 0; }
  30% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.char { display: inline-block; will-change: transform, filter; }
.line-mask { overflow: hidden; display: block; }
.line-mask > span { display: block; }

.fleet-track {
  display: flex; gap: 1.25rem;
  padding: 2rem 0 3rem;
  overflow-x: auto; overflow-y: visible;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.fleet-track::-webkit-scrollbar { display: none; }
.fleet-card {
  flex: 0 0 min(78vw, 340px);
  scroll-snap-align: center;
  padding: 1.4rem;
  border-radius: 18px;
  min-height: 420px;
  display: flex; flex-direction: column;
  justify-content: space-between;
  transform-style: preserve-3d;
  cursor: none;
}
body.is-coarse .fleet-card { cursor: pointer; }
.fleet-card .glare {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(circle at var(--gx,50%) var(--gy,30%), rgba(255,255,255,0.18), transparent 45%);
  opacity: 0; transition: opacity 0.3s;
  mix-blend-mode: soft-light;
}
.fleet-card:hover .glare, .fleet-card:focus-visible .glare { opacity: 1; }
.fleet-rail {
  position: relative; height: 2px; margin-top: 1rem;
  background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
}
.fleet-rail > i {
  position: absolute; top: -3px; width: 8px; height: 8px; border-radius: 50%;
  background: var(--ice); box-shadow: 0 0 12px var(--ice);
}

.archive-filters {
  display: inline-flex; padding: 4px; border-radius: 999px; gap: 2px;
  margin: 2rem 0;
}
.archive-filters button {
  position: relative; padding: 0.55rem 1rem; border-radius: 999px;
  font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.14em;
  color: var(--ink-dim); z-index: 1;
}
.archive-filters .indicator {
  position: absolute; inset: 4px auto 4px 4px; border-radius: 999px;
  background: rgba(255,255,255,0.08); border: 1px solid var(--line-bright);
}
.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.25rem;
}
.archive-card {
  border-radius: 16px; padding: 1.25rem; min-height: 220px;
  display: flex; flex-direction: column; gap: 0.75rem;
  transition: transform 0.45s var(--ease), box-shadow 0.45s;
  box-shadow: 0 10px 30px -15px rgba(0,0,0,0.5);
}
.archive-card:hover, .archive-card:focus-visible {
  transform: translateY(-6px);
  box-shadow:
    0 4px 0 -1px rgba(255,255,255,0.04),
    0 20px 40px -18px rgba(0,0,0,0.7),
    0 40px 60px -30px rgba(0,0,0,0.45);
}

.modal-root {
  position: fixed; inset: 0; z-index: 500;
  display: grid; place-items: center;
  padding: 1rem;
}
.modal-backdrop {
  position: absolute; inset: 0;
  background: rgba(4,4,8,0.72);
  backdrop-filter: blur(18px) saturate(140%);
}
.modal-backdrop::after {
  content: ""; position: absolute; inset: 0;
  opacity: 0.08;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.modal-wipe {
  position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(142,200,255,0.04) 1px, rgba(142,200,255,0.04) 2px),
    radial-gradient(circle at 50% 50%, rgba(255,122,69,0.15), transparent 60%);
  mix-blend-mode: screen;
}
.modal-panel {
  position: relative; z-index: 3;
  width: min(720px, 100%);
  max-height: min(88vh, 860px);
  overflow: auto;
  border-radius: 20px;
  padding: clamp(1.25rem, 3vw, 2rem);
}
.modal-close {
  position: absolute; top: 1rem; right: 1rem;
  width: 40px; height: 40px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.06);
  font-size: 1.2rem;
}

.timeline-wrap { position: relative; padding-left: clamp(1rem, 4vw, 3rem); }
.timeline-line {
  position: absolute; left: clamp(1.4rem, 4.5vw, 3.5rem); top: 0; bottom: 0; width: 2px;
  background: linear-gradient(to bottom, transparent, rgba(142,200,255,0.35), rgba(255,122,69,0.35), transparent);
}
.timeline-comet {
  position: absolute; left: clamp(1.4rem, 4.5vw, 3.5rem); width: 10px; height: 10px;
  margin-left: -4px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 20px 6px rgba(142,200,255,0.55), 0 0 40px 10px rgba(255,122,69,0.25);
  animation: cometPulse 1.8s ease-in-out infinite;
}
@keyframes cometPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}
.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 1rem;
  margin-bottom: 2.5rem;
  max-width: 640px;
}
.timeline-item:nth-child(even) { margin-left: clamp(0px, 8vw, 120px); }
.timeline-dot {
  position: absolute; left: calc(clamp(1.4rem, 4.5vw, 3.5rem) - clamp(1rem, 4vw, 3rem) - 3px);
  top: 0.45rem; width: 8px; height: 8px; border-radius: 50%;
  background: var(--ice); box-shadow: 0 0 0 4px rgba(142,200,255,0.15);
}

.marquee {
  overflow: hidden; padding: 1.5rem 0;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.marquee-row {
  display: flex; gap: 2rem; width: max-content;
  font-family: var(--font-display); font-weight: 700;
  font-size: clamp(1.4rem, 3vw, 2.4rem); letter-spacing: -0.02em;
  white-space: nowrap;
}
.marquee-row span { display: inline-flex; align-items: center; gap: 2rem; opacity: 0.55; }
.marquee-row .sep { color: var(--rust); animation: sepPulse 2s ease-in-out infinite; }
@keyframes sepPulse { 50% { opacity: 0.3; transform: scale(1.3); } }

.voice-card {
  position: relative; padding: 2rem 1.5rem; border-radius: 18px;
  overflow: hidden; min-height: 280px;
}
.voice-card .ghost-q {
  position: absolute; right: 0.5rem; top: -0.5rem;
  font-family: var(--font-display); font-size: 8rem; font-weight: 800;
  color: rgba(255,255,255,0.03); line-height: 1; pointer-events: none;
}
.signal-bars { display: flex; align-items: flex-end; gap: 3px; height: 16px; }
.signal-bars i {
  width: 3px; background: var(--ice); border-radius: 1px;
  animation: barDance 1.2s ease-in-out infinite;
}
.signal-bars i:nth-child(1){ height: 40%; animation-delay: 0s; }
.signal-bars i:nth-child(2){ height: 70%; animation-delay: 0.1s; }
.signal-bars i:nth-child(3){ height: 100%; animation-delay: 0.2s; }
.signal-bars i:nth-child(4){ height: 55%; animation-delay: 0.3s; }
.signal-bars i:nth-child(5){ height: 80%; animation-delay: 0.4s; }
@keyframes barDance {
  0%,100% { transform: scaleY(0.6); opacity: 0.6; }
  50% { transform: scaleY(1); opacity: 1; }
}

.stat-cell {
  border-radius: 16px; padding: 1.4rem; min-height: 160px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.odometer {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.2rem, 5vw, 3.5rem); letter-spacing: -0.04em;
  display: flex; overflow: hidden; height: 1.1em; line-height: 1.1em;
}
.odometer .digit {
  height: 1.1em; overflow: hidden; display: inline-block; width: 0.62em; text-align: center;
}
.odometer .digit > span {
  display: flex; flex-direction: column;
  transition: transform 1.2s var(--ease);
}

.moon-map-wrap {
  display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 2rem; align-items: center;
}
@media (max-width: 900px) {
  .moon-map-wrap { grid-template-columns: 1fr; }
  .nav-links { display: none; }
}
.moon-disc {
  position: relative; aspect-ratio: 1; width: min(100%, 520px); margin: 0 auto;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, #e8eef5 0%, #9aa7b8 18%, #5c6678 42%, #2a303c 70%, #0c0e14 100%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.08),
    0 0 60px rgba(142,200,255,0.15),
    inset -30px -20px 60px rgba(0,0,0,0.45),
    inset 20px 15px 40px rgba(255,255,255,0.08);
  animation: moonSpin 120s linear infinite;
  overflow: hidden;
}
@keyframes moonSpin { to { transform: rotate(360deg); } }
.moon-disc .tycho {
  position: absolute; left: 58%; top: 72%; width: 8%; height: 8%; border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, rgba(255,255,255,0.2) 40%, transparent 70%);
  box-shadow: 0 0 20px rgba(255,255,255,0.25);
}
.moon-disc .tycho::before {
  content: ""; position: absolute; left: 50%; top: 50%; width: 600%; height: 600%;
  margin: -300% 0 0 -300%;
  background: conic-gradient(from 0deg, transparent 0 8%, rgba(255,255,255,0.07) 8% 9%, transparent 9% 20%, rgba(255,255,255,0.05) 20% 21%, transparent 21% 40%, rgba(255,255,255,0.06) 40% 41%, transparent 41% 100%);
  animation: moonSpin 120s linear infinite reverse;
}
.moon-pin {
  position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px;
  border-radius: 50%; background: var(--rust);
  box-shadow: 0 0 0 0 rgba(255,122,69,0.5);
  animation: sonar 2.2s ease-out infinite;
  z-index: 2;
  transform: rotate(calc(var(--spin, 0) * -1deg));
}
.moon-pin.live { background: var(--ice); }
.moon-crosshair {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
}
.moon-crosshair span {
  position: absolute; background: rgba(142,200,255,0.35);
}
.moon-tooltip {
  position: absolute; z-index: 5; padding: 0.75rem 1rem; border-radius: 12px;
  min-width: 180px; pointer-events: none;
}

.deep-counters {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem;
}
.instrument {
  border-radius: 16px; padding: 1.1rem; text-align: center;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06), 0 10px 30px -15px rgba(0,0,0,0.5);
}
.instrument .val {
  font-family: var(--font-mono); font-size: clamp(1.2rem, 3vw, 1.8rem); font-weight: 500;
}
.instrument .val sup { font-size: 0.55em; color: var(--ink-dim); }

.footer {
  position: relative; padding: 5rem clamp(1.25rem, 4vw, 4rem) 3rem;
  border-top: 1px solid var(--line);
}
.footer-mark {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(3rem, 14vw, 10rem);
  letter-spacing: -0.05em; line-height: 0.85;
  color: transparent; -webkit-text-stroke: 1px rgba(232,238,245,0.18);
  width: 100%; text-align: center; margin-bottom: 3rem;
}
.footer-links {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;
  margin-bottom: 2.5rem;
}
.footer-links a {
  display: block; padding: 1rem 1.2rem; border-radius: 14px;
  font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.1em;
}

.canvas-fallback {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 40% 40%, #3a4250 0%, #12151c 45%, #07070c 80%),
    linear-gradient(135deg, rgba(255,122,69,0.08), transparent 40%);
}
.canvas-fallback.mars {
  background:
    radial-gradient(ellipse at 55% 45%, #6a3a28 0%, #1a1010 50%, #07070c 80%);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .moon-disc { animation: none; }
  .holo-foil::after, .glass-0::before, .glass-1::before, .glass-2::before, .glass-3::before, .glass-4::before { animation: none; }
}
@media (max-width: 640px) {
  .timeline-item { grid-template-columns: 64px 1fr; }
  .fleet-card { flex-basis: min(86vw, 300px); min-height: 380px; }
  .display-xl { font-size: clamp(2.6rem, 14vw, 4.5rem); }
}
`


/* ═══════════════════════════════════════════════════════════
   UTILITIES · HOOKS · ERROR BOUNDARY
   ═══════════════════════════════════════════════════════════ */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }
function lerp(a, b, t) { return a + (b - a) * t }
function map(n, a, b, c, d) { return c + ((n - a) / (b - a)) * (d - c) }

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789░▒▓█/<>=+#*'

function useMediaQuery(query) {
  const [match, setMatch] = useState(false)
  useEffect(() => {
    const m = window.matchMedia(query)
    const fn = () => setMatch(m.matches)
    fn()
    m.addEventListener?.('change', fn)
    return () => m.removeEventListener?.('change', fn)
  }, [query])
  return match
}

function useIsCoarse() {
  return useMediaQuery('(pointer: coarse)')
}

function usePrefersReduced() {
  const framer = useReducedMotion()
  const mq = useMediaQuery('(prefers-reduced-motion: reduce)')
  return !!(framer || mq)
}

function useSmoothScrollProgress(ref, opts = {}) {
  const { scrollYProgress } = useScroll({ target: ref, offset: opts.offset || ['start end', 'end start'] })
  return useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
}

function useMouse() {
  const mouse = useRef({ x: 0, y: 0, nx: 0, ny: 0 })
  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      mouse.current.nx = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.ny = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  return mouse
}

function useUTCClock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return t.toISOString().replace('T', ' · ').replace(/\.\d+Z$/, ' UTC')
}

function usePioneerDistance() {
  // Epoch: ~132.67 AU on 2023-01-01, ~2.54 AU/year outbound
  const [au, setAu] = useState(134.2)
  useEffect(() => {
    const epoch = Date.UTC(2023, 0, 1)
    const auPerMs = 2.54 / (365.25 * 24 * 3600 * 1000)
    const tick = () => {
      const now = Date.now()
      setAu(132.67 + (now - epoch) * auPerMs)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return au
}

function scrambleText(target, progress) {
  if (progress >= 1) return target
  const n = Math.floor(target.length * progress)
  let out = ''
  for (let i = 0; i < target.length; i++) {
    if (target[i] === ' ') { out += ' '; continue }
    out += i < n ? target[i] : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
  }
  return out
}

function ScrambleLine({ text, active = true, className = '', as: Tag = 'span', delay = 0 }) {
  const [val, setVal] = useState(text)
  const reduced = usePrefersReduced()
  useEffect(() => {
    if (!active || reduced) { setVal(text); return }
    let frame = 0
    let raf
    const start = performance.now() + delay
    const dur = 900
    const loop = (now) => {
      if (now < start) { raf = requestAnimationFrame(loop); return }
      const p = clamp((now - start) / dur, 0, 1)
      setVal(scrambleText(text, p * p))
      if (p < 1) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [text, active, reduced, delay])
  return <Tag className={className}>{val}</Tag>
}

function Typewriter({ text, active = true, speed = 18, className = '', style, onDone }) {
  const [n, setN] = useState(0)
  const reduced = usePrefersReduced()
  useEffect(() => {
    if (!active) { setN(0); return }
    if (reduced) { setN(text.length); onDone?.(); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) { clearInterval(id); onDone?.() }
    }, speed)
    return () => clearInterval(id)
  }, [text, active, reduced, speed])
  return <span className={`caret ${className}`} style={style}>{text.slice(0, n)}</span>
}

function LineReveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = usePrefersReduced()
  return (
    <span ref={ref} className={`line-mask ${className}`}>
      <motion.span
        initial={reduced ? false : { y: '110%' }}
        animate={inView || reduced ? { y: 0 } : { y: '110%' }}
        transition={{ duration: 0.9, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function SplitChars({ text, className = '', staggerMs = 28, from = 'hero' }) {
  const reduced = usePrefersReduced()
  const chars = useMemo(() => Array.from(text), [text])
  return (
    <span className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          className="char"
          aria-hidden="true"
          initial={reduced ? false : { opacity: 0, rotateX: 90, filter: 'blur(8px)', y: 24 }}
          animate={{ opacity: 1, rotateX: 0, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: i * (staggerMs / 1000), duration: 0.7, ease: EASE }}
          style={{ display: 'inline-block', whiteSpace: ch === ' ' ? 'pre' : undefined, transformOrigin: '50% 80%' }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </span>
  )
}

function MagneticButton({ children, onClick, href, className = '', ...rest }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const labelX = useMotionValue(0)
  const labelY = useMotionValue(0)
  const coarse = useIsCoarse()
  const reduced = usePrefersReduced()

  const onMove = (e) => {
    if (coarse || reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    x.set(dx * 0.28)
    y.set(dy * 0.28)
    labelX.set(dx * -0.12)
    labelY.set(dy * -0.12)
  }
  const onLeave = () => {
    animate(x, 0, { type: 'spring', ...SPRING })
    animate(y, 0, { type: 'spring', ...SPRING })
    animate(labelX, 0, { type: 'spring', ...SPRING })
    animate(labelY, 0, { type: 'spring', ...SPRING })
  }
  const Comp = href ? motion.a : motion.button
  return (
    <Comp
      ref={ref}
      href={href}
      className={`mag-btn ${className}`}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      {...rest}
    >
      <span className="fill" />
      <motion.span style={{ x: labelX, y: labelY, display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
        {children}
        <span className="arrow" aria-hidden>→</span>
      </motion.span>
    </Comp>
  )
}

function Odometer({ value, digits = 3 }) {
  const str = String(Math.floor(value)).padStart(digits, '0').slice(-digits)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div className="odometer" ref={ref} aria-label={String(value)}>
      {str.split('').map((d, i) => (
        <span className="digit" key={i}>
          <span style={{ transform: inView ? `translateY(-${Number(d) * 1.1}em)` : 'translateY(0)' }}>
            {Array.from({ length: 10 }, (_, n) => <span key={n}>{n}</span>)}
          </span>
        </span>
      ))}
    </div>
  )
}

function Sparkline({ data = [], color = 'var(--ice)' }) {
  const d = useMemo(() => {
    const max = Math.max(...data, 1)
    const w = 64, h = 24
    return data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  }, [data])
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={d} opacity="0.7" />
      <circle cx={d.split(' ').pop()?.split(',')[0]} cy={d.split(' ').pop()?.split(',')[1]} r="2" fill={color} />
    </svg>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.warn('[SilentFleet]', err?.message || err) }
  render() {
    if (this.state.err) {
      return this.props.fallback || (
        <div className={`canvas-fallback ${this.props.variant || ''}`} role="presentation" />
      )
    }
    return this.props.children
  }
}

const CursorCtx = createContext({ setLabel: () => {}, setVisible: () => {} })
function useCursor() { return useContext(CursorCtx) }

/* ═══════════════════════════════════════════════════════════
   WEBGL — Moon / Mars shaders · Starfield · Debris · Pioneer
   ═══════════════════════════════════════════════════════════ */

const NOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f=0.0; float a=0.5;
  for(int i=0;i<4;i++){f+=a*snoise(p);p*=2.03;a*=0.5;}
  return f;
}
float crater(vec3 p, vec3 c, float r){
  float d=length(p-c);
  float bowl=smoothstep(r,r*0.2,d)*(-0.08*r);
  float rim=smoothstep(r*1.15,r,d)*smoothstep(r*0.75,r,d)*0.045*r;
  return bowl+rim;
}
`

const MOON_VERT = `
uniform float uTime;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vDisp;
${NOISE_GLSL}
float displace(vec3 p){
  float d = fbm(p*2.2)*0.07;
  // ~12 analytical craters
  d += crater(p, normalize(vec3(0.8,0.4,0.3)), 0.35);
  d += crater(p, normalize(vec3(-0.6,0.5,0.4)), 0.22);
  d += crater(p, normalize(vec3(0.2,-0.7,0.5)), 0.28);
  d += crater(p, normalize(vec3(-0.3,-0.2,0.9)), 0.18);
  d += crater(p, normalize(vec3(0.5,0.8,-0.2)), 0.25);
  d += crater(p, normalize(vec3(-0.9,0.1,-0.2)), 0.3);
  d += crater(p, normalize(vec3(0.1,0.2,-0.95)), 0.2);
  d += crater(p, normalize(vec3(0.7,-0.5,-0.4)), 0.16);
  d += crater(p, normalize(vec3(-0.4,0.85,0.1)), 0.14);
  d += crater(p, normalize(vec3(0.3,0.1,0.9)), 0.12);
  d += crater(p, normalize(vec3(-0.7,-0.6,0.2)), 0.19);
  d += crater(p, normalize(vec3(0.0,-0.9,-0.3)), 0.24);
  return d;
}
void main(){
  vec3 p = position;
  float disp = displace(normalize(p));
  vDisp = disp;
  vec3 newPos = p + normal * disp;
  vPos = newPos;
  vNormal = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(newPos,1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const MOON_FRAG = `
uniform float uTime;
uniform vec3 uColorCool;
uniform vec3 uColorWarm;
uniform vec3 uRim;
uniform float uGlitter;
uniform float uScan;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vDisp;
${NOISE_GLSL}
void main(){
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.6,0.35,0.7));
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = dot(N,L);
  float wrap = ndl*0.5+0.5;
  vec3 albedo = mix(uColorCool, uColorWarm, wrap);
  float n = fbm(vPos*3.5)*0.5+0.5;
  albedo *= 0.75 + n*0.35;
  // triplanar-ish speckles
  float spark = step(0.97, fract(snoise(vPos*40.0)*0.5+0.5+uTime*0.05));
  albedo += spark * uGlitter * vec3(1.0);
  float fres = pow(1.0 - max(dot(N,V),0.0), 2.8);
  albedo += uRim * fres * 0.55;
  // spectral scan band every ~9s
  float band = abs(fract(vPos.y*0.5 + uTime/9.0) - 0.5);
  float scan = smoothstep(0.08, 0.0, band) * uScan;
  vec3 irid = vec3(0.4,0.7,1.0)*0.5 + vec3(1.0,0.4,0.6)*0.3;
  albedo += irid * scan;
  float shade = mix(0.15, 1.0, wrap);
  gl_FragColor = vec4(albedo * shade, 1.0);
}
`

const STAR_VERT = `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec3 p = position;
  p.x += sin(uTime*0.02 + aSeed)*0.15;
  p.y += cos(uTime*0.015 + aSeed*2.0)*0.1;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float twinkle = 0.55 + 0.45*sin(uTime*(0.8+aSeed*2.0)+aSeed*20.0);
  vAlpha = twinkle;
  gl_PointSize = aSize * uPixelRatio * (180.0 / -mv.z) * twinkle;
  gl_Position = projectionMatrix * mv;
}
`
const STAR_FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if(a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`

const NEBULA_FRAG = `
uniform float uTime;
uniform vec2 uRes;
varying vec2 vUv;
${NOISE_GLSL}
void main(){
  vec2 uv = vUv;
  vec3 p = vec3(uv*2.0, uTime*0.02);
  float n = fbm(p + vec3(fbm(p*1.5)));
  vec3 col = mix(vec3(0.12,0.05,0.18), vec3(0.35,0.12,0.08), n);
  col = mix(col, vec3(0.15,0.1,0.35), fbm(p.zyx*1.2));
  float a = smoothstep(0.2, 0.8, n) * 0.055;
  gl_FragColor = vec4(col, a);
}
`
const NEBULA_VERT = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`

function Starfield({ count = 14000, mouse }) {
  const mat = useRef()
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 80
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i*3+2] = r * Math.cos(phi)
      size[i] = 0.4 + Math.random() * 1.8
      seed[i] = Math.random()
      const amber = Math.random() > 0.82
      col[i*3] = amber ? 1.0 : 0.75 + Math.random()*0.25
      col[i*3+1] = amber ? 0.85 : 0.85 + Math.random()*0.15
      col[i*3+2] = amber ? 0.55 : 1.0
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.8) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    if (mouse?.current) {
      state.camera.position.x = lerp(state.camera.position.x, mouse.current.nx * 0.35, 0.04)
      state.camera.position.y = lerp(state.camera.position.y, -mouse.current.ny * 0.25, 0.04)
    }
  })
  return <points geometry={geo} material={material} ref={mat} />
}

function NebulaPlane() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: NEBULA_VERT,
    fragmentShader: NEBULA_FRAG,
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1,1) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])
  useFrame((s) => { mat.uniforms.uTime.value = s.clock.elapsedTime })
  return (
    <mesh position={[0, 0, -30]} scale={[60, 40, 1]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

function BodySphere({ colorCool, colorWarm, rim, glitter = 0.35, scan = 0.35, scale = 1.6, position = [0,0,0], subdivisions = 64, mobile = false }) {
  const mesh = useRef()
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorCool: { value: new THREE.Color(colorCool) },
    uColorWarm: { value: new THREE.Color(colorWarm) },
    uRim: { value: new THREE.Color(rim) },
    uGlitter: { value: glitter },
    uScan: { value: scan },
  }), [colorCool, colorWarm, rim, glitter, scan])
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    if (mesh.current) mesh.current.rotation.y = s.clock.elapsedTime * 0.04
  })
  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <icosahedronGeometry args={[1, mobile ? 32 : subdivisions]} />
      <shaderMaterial vertexShader={MOON_VERT} fragmentShader={MOON_FRAG} uniforms={uniforms} />
    </mesh>
  )
}

function GhostShell({ scale = 1.28 }) {
  const ref = useRef()
  useFrame((s) => {
    if (!ref.current) return
    ref.current.rotation.x = s.clock.elapsedTime * 0.07
    ref.current.rotation.z = s.clock.elapsedTime * 0.05
  })
  return (
    <mesh ref={ref} scale={scale}>
      <icosahedronGeometry args={[1.6, 2]} />
      <meshBasicMaterial color="#8ec8ff" wireframe transparent opacity={0.07} />
    </mesh>
  )
}

function OrbitalTorus() {
  const ref = useRef()
  useFrame((s) => { if (ref.current) ref.current.rotation.x = Math.PI/2.6 + Math.sin(s.clock.elapsedTime*0.2)*0.05 })
  return (
    <mesh ref={ref} rotation={[Math.PI/2.6, 0, 0]}>
      <torusGeometry args={[2.6, 0.008, 8, 128]} />
      <meshBasicMaterial color="#8ec8ff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

function MarsBob({ mobile }) {
  const g = useRef()
  useFrame((s) => {
    if (!g.current) return
    g.current.position.y = 0.9 + Math.sin(s.clock.elapsedTime * 0.6) * 0.15
    g.current.position.x = 2.4 + Math.sin(s.clock.elapsedTime * 0.3) * 0.1
  })
  return (
    <group ref={g} position={[2.4, 0.9, -1.2]}>
      <BodySphere
        colorCool="#3a1810" colorWarm="#ff7a45" rim="#ff9a6a"
        glitter={0.2} scan={0.25} scale={0.45} subdivisions={48} mobile={mobile}
      />
    </group>
  )
}

function DebrisField({ mouse, count = 48 }) {
  const mesh = useRef()
  const { positions, rotations, speeds, rust } = useMemo(() => {
    const positions = []
    const rotations = []
    const speeds = []
    const rust = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const inc = 0.3 + (i % 5) * 0.08
      const r = 3.2 + (i % 7) * 0.25
      positions.push(new THREE.Vector3(Math.cos(a)*r, Math.sin(a*0.7)*inc, Math.sin(a)*r*0.6))
      rotations.push(new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI))
      speeds.push(0.15 + Math.random()*0.35)
      rust.push(Math.random() < 0.35)
    }
    return { positions, rotations, speeds, rust }
  }, [count])

  const geos = useMemo(() => [
    new THREE.TetrahedronGeometry(0.08),
    new THREE.BoxGeometry(0.1, 0.06, 0.08),
    new THREE.OctahedronGeometry(0.07),
  ], [])

  useFrame((s, dt) => {
    if (!mesh.current) return
    const t = s.clock.elapsedTime
    mesh.current.children.forEach((ch, i) => {
      const a = t * speeds[i] + i
      const r = 3.2 + (i % 7) * 0.25
      let x = Math.cos(a) * r
      let y = Math.sin(a * 0.7) * (0.3 + (i % 5) * 0.08)
      let z = Math.sin(a) * r * 0.6
      if (mouse?.current) {
        const dx = x - mouse.current.nx * 3
        const dy = y + mouse.current.ny * 2
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.001
        const force = clamp(0.8 / (dist * dist), 0, 0.6)
        x += (dx / dist) * force
        y += (dy / dist) * force
      }
      ch.position.set(x, y, z)
      ch.rotation.x += dt * speeds[i]
      ch.rotation.y += dt * speeds[i] * 0.7
    })
  })

  return (
    <group ref={mesh}>
      {positions.map((_, i) => (
        <mesh key={i} geometry={geos[i % 3]} castShadow={false}>
          <meshStandardMaterial
            color={rust[i] ? '#8a4030' : '#8a94a3'}
            metalness={0.7}
            roughness={0.45}
            emissive={rust[i] ? '#3a1510' : '#10141a'}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}

function PostFX({ mobile, reduced }) {
  // Lightweight fullscreen grain + vignette via CSS overlay handled outside;
  // in-canvas: simple additive flash plane for rare glitch cue
  const flash = useRef()
  useFrame((s) => {
    if (mobile || reduced || !flash.current) return
    const t = s.clock.elapsedTime
    const cycle = t % 12
    const on = cycle > 11.75
    flash.current.material.opacity = on ? 0.08 + Math.random() * 0.06 : 0
  })
  if (mobile || reduced) return null
  return (
    <mesh ref={flash} position={[0, 0, 2.5]} renderOrder={999}>
      <planeGeometry args={[8, 5]} />
      <meshBasicMaterial color="#8ec8ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

function HeroCameraRig({ scrollProgress, mouse, reduced }) {
  const { camera } = useThree()
  useFrame(() => {
    const p = scrollProgress?.get?.() ?? 0
    const z = lerp(7.4, 6.2, p)
    const fov = lerp(48, 42, p)
    camera.position.z = lerp(camera.position.z, z, 0.04)
    if ('fov' in camera) {
      camera.fov = lerp(camera.fov, fov, 0.04)
      camera.updateProjectionMatrix()
    }
    if (!reduced && mouse?.current) {
      camera.rotation.x = lerp(camera.rotation.x, -mouse.current.ny * 0.04, 0.04)
      camera.rotation.y = lerp(camera.rotation.y, -mouse.current.nx * 0.05, 0.04)
    }
  })
  return null
}

function HeroSceneContent({ scrollProgress, mouse, mobile, reduced }) {
  useFrame(() => invalidate())
  return (
    <>
      <color attach="background" args={['#050508']} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 2, 3]} intensity={1.1} color="#fff2e0" />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#6a8cff" />
      <HeroCameraRig scrollProgress={scrollProgress} mouse={mouse} reduced={reduced} />
      <Starfield count={mobile ? 6000 : 15000} mouse={mouse} />
      <NebulaPlane />
      <BodySphere
        colorCool="#1a1e28" colorWarm="#c4cdd8" rim="#8ec8ff"
        glitter={0.4} scan={0.4} scale={1.55} subdivisions={mobile ? 32 : 64} mobile={mobile}
      />
      <GhostShell />
      <OrbitalTorus />
      <MarsBob mobile={mobile} />
      {!mobile && <DebrisField mouse={mouse} count={44} />}
      <PostFX mobile={mobile} reduced={reduced} />
    </>
  )
}

function HeroCanvas({ scrollProgress }) {
  const mouse = useMouse()
  const mobile = useMediaQuery('(max-width: 768px)')
  const reduced = usePrefersReduced()
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '20% 0px', amount: 0.05 })
  const [mounted, setMounted] = useState(false)
  useEffect(() => { if (inView) setMounted(true) }, [inView])

  return (
    <div ref={ref} className="hero-canvas" aria-hidden>
      <ErrorBoundary variant="">
        {mounted ? (
          <Canvas
            dpr={[1, 1.8]}
            camera={{ position: [0, 0, 7.4], fov: 48, near: 0.1, far: 200 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            frameloop={inView && !reduced ? 'always' : 'never'}
            onCreated={({ gl }) => { gl.setClearColor('#050508') }}
          >
            <Suspense fallback={null}>
              <HeroSceneContent scrollProgress={scrollProgress} mouse={mouse} mobile={mobile} reduced={reduced} />
            </Suspense>
          </Canvas>
        ) : (
          <div className="canvas-fallback" />
        )}
      </ErrorBoundary>
      <div className="scanlines" style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.25 }} />
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,8,0.75) 100%)',
      }} />
    </div>
  )
}

function PioneerProbe({ mouse }) {
  const g = useRef()
  useFrame((s) => {
    if (!g.current) return
    g.current.rotation.y = s.clock.elapsedTime * 0.12
    if (mouse?.current) {
      g.current.rotation.x = lerp(g.current.rotation.x, mouse.current.ny * 0.2, 0.05)
      g.current.rotation.z = lerp(g.current.rotation.z, mouse.current.nx * 0.15, 0.05)
    }
  })
  const dishPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const r = t * 0.9
      const y = r * r * 0.35
      pts.push(new THREE.Vector2(r, y))
    }
    return pts
  }, [])
  return (
    <group ref={g} scale={1.15}>
      {/* dish */}
      <mesh rotation={[Math.PI, 0, 0]} position={[0, 0.15, 0]}>
        <latheGeometry args={[dishPoints, 64]} />
        <meshStandardMaterial color="#b8c0cc" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* feed */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* bus */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.55, 0.35, 0.45]} />
        <meshStandardMaterial color="#6a7180" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* rust emissive strips */}
      {[-0.2, 0, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.55, 0.23]}>
          <boxGeometry args={[0.06, 0.28, 0.01]} />
          <meshStandardMaterial color="#ff7a45" emissive="#ff7a45" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* RTG booms */}
      {[ -1, 0, 1 ].map((s, i) => (
        <group key={i} rotation={[0, 0, (s * Math.PI) / 3]} position={[0, 0.55, 0]}>
          <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.015, 0.015, 1.1, 6]} />
            <meshStandardMaterial color="#777" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[1.25, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.2, 12]} />
            <meshStandardMaterial color="#4a4038" emissive="#ff6030" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
      {/* gold plaque */}
      <mesh position={[0.28, 0.55, 0.24]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.18, 0.12]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff9a2e" emissiveIntensity={0.45} metalness={0.9} roughness={0.25} />
      </mesh>
      {/* signal rings */}
      {[0, 1, 2].map((i) => <SignalRing key={i} delay={i * 1.1} />)}
    </group>
  )
}

function SignalRing({ delay = 0 }) {
  const ref = useRef()
  useFrame((s) => {
    if (!ref.current) return
    const t = ((s.clock.elapsedTime + delay) % 3.3) / 3.3
    const sc = 0.3 + t * 3.2
    ref.current.scale.set(sc, sc, sc)
    ref.current.material.opacity = (1 - t) * 0.35
  })
  return (
    <mesh ref={ref} rotation={[Math.PI/2, 0, 0]} position={[0, -0.4, 0]}>
      <torusGeometry args={[0.5, 0.01, 8, 64]} />
      <meshBasicMaterial color="#ffb347" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

function DeepSpaceCanvas() {
  const mouse = useMouse()
  const mobile = useMediaQuery('(max-width: 768px)')
  const reduced = usePrefersReduced()
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '15% 0px' })
  const [mounted, setMounted] = useState(false)
  useEffect(() => { if (inView) setMounted(true) }, [inView])

  return (
    <div ref={ref} style={{ position:'absolute', inset:0, zIndex:0 }} aria-hidden>
      <ErrorBoundary variant="mars">
        {mounted ? (
          <Canvas
            dpr={[1, 1.6]}
            camera={{ position: [0, 0.4, 5.5], fov: 42 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            frameloop={inView && !reduced ? 'always' : 'never'}
          >
            <ambientLight intensity={0.25} />
            <directionalLight position={[3, 4, 2]} intensity={1.2} color="#fff0e0" />
            <pointLight position={[-2, 1, 2]} intensity={0.4} color="#ff7a45" />
            <Starfield count={mobile ? 4000 : 10000} mouse={mouse} />
            <Float speed={0.6} rotationIntensity={0.1} floatIntensity={0.2}>
              <PioneerProbe mouse={mouse} />
            </Float>
          </Canvas>
        ) : <div className="canvas-fallback mars" />}
      </ErrorBoundary>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   UI SECTIONS
   ═══════════════════════════════════════════════════════════ */

function Preloader({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [logIdx, setLogIdx] = useState(0)
  const [exit, setExit] = useState(false)
  const reduced = usePrefersReduced()
  const failsafe = useRef(false)

  useEffect(() => {
    const start = performance.now()
    const dur = reduced ? 400 : 2800
    let raf
    const loop = (now) => {
      const p = clamp((now - start) / dur, 0, 1)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(loop)
      else {
        setExit(true)
        setTimeout(() => onDone?.(), reduced ? 200 : 900)
      }
    }
    raf = requestAnimationFrame(loop)
    const fail = setTimeout(() => {
      if (!failsafe.current) {
        failsafe.current = true
        setExit(true)
        onDone?.()
      }
    }, 6000)
    return () => { cancelAnimationFrame(raf); clearTimeout(fail) }
  }, [onDone, reduced])

  useEffect(() => {
    const id = setInterval(() => setLogIdx((i) => (i + 1) % MISSION_LOG.length), 420)
    return () => clearInterval(id)
  }, [])

  const pct = Math.floor(progress * 100)
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = circ * progress

  return (
        <motion.div
          className="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ position:'relative', zIndex:2, textAlign:'center' }}>
            <div className="kicker" style={{ marginBottom: '1.5rem' }}>
              <ScrambleLine text="MISSION UPLINK · SILENT FLEET" active />
            </div>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ margin:'0 auto 1.5rem' }}>
              <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <motion.circle
                cx="70" cy="70" r={r} fill="none" stroke="#8ec8ff" strokeWidth="2"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
              />
              <text x="70" y="75" textAnchor="middle" fill="#e8eef5" fontFamily="IBM Plex Mono, monospace" fontSize="18">
                {String(pct).padStart(2,'0')}
              </text>
            </svg>
            <div className="mono" style={{ fontSize:'0.7rem', letterSpacing:'0.14em', color:'var(--ink-dim)', minHeight:'1.2em' }}>
              <ScrambleLine text={MISSION_LOG[logIdx]} active key={logIdx} />
            </div>
          </div>
          {exit && (
            <div className="preloader-panels" aria-hidden>
              {[0,1,2,3].map((i) => (
                <motion.span
                  key={i}
                  initial={{ scaleY: 1 }}
                  animate={{ scaleY: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
                />
              ))}
            </div>
          )}
        </motion.div>
  )
}

function Nav({ progress }) {
  const scaleX = useSpring(progress, { stiffness: 120, damping: 28 })
  return (
    <header className="nav" role="banner">
      <a href="#top" className="nav-brand" aria-label="Silent Fleet home">SILENT FLEET</a>
      <nav className="nav-links" aria-label="Primary">
        {[
          ['#prologue','PROLOGUE'],
          ['#fleet','FLEET'],
          ['#archive','ARCHIVE'],
          ['#moon','MOON'],
          ['#timeline','TIMELINE'],
          ['#voices','VOICES'],
          ['#deep','DEEP SPACE'],
        ].map(([href, label]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>
      <motion.div className="nav-progress" style={{ scaleX, width: '100%' }} />
    </header>
  )
}

function Hero({ scrollProgress, ready }) {
  const { setLabel } = useCursorSafe()
  return (
    <section className="hero" id="top" aria-label="Hero">
      <HeroCanvas scrollProgress={scrollProgress} />
      <div className="hero-content">
        <p className="kicker" style={{ marginBottom: '1.25rem' }}>
          <ScrambleLine text="NASA SPACE APPS 2026 · ABANDONED BUT NOT FORGOTTEN" active={ready} />
        </p>
        <h1 className="display display-xl" style={{ marginBottom: '1.25rem' }}>
          {ready && (
            <>
              <SplitChars text="THE" staggerMs={28} />
              {' '}
              <span className="outline-text"><SplitChars text="SILENT" staggerMs={28} /></span>
              <br />
              <span className="grad-text" style={{ display:'inline-block' }}>
                <SplitChars text="FLEET" staggerMs={28} />
              </span>
              <br />
              <span style={{ position:'relative' }}>
                <SplitChars text="IS NOT" staggerMs={28} />
                {' '}
                <span className="grad-text" style={{ WebkitTextStroke: '0', color: 'transparent' }}>
                  <motion.span
                    style={{
                      display:'inline-block',
                      background: 'linear-gradient(90deg, #ff7a45, #8ec8ff, #ff7a45, #6b5cff)',
                      backgroundSize: '300% 100%',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  >
                    <SplitChars text="FORGOTTEN" staggerMs={28} />
                  </motion.span>
                </span>
              </span>
            </>
          )}
        </h1>
        <p style={{ maxWidth: 520, color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', lineHeight: 1.55, marginBottom: '2rem' }}>
          Hardware NASA left on the Moon, on Mars, and beyond the heliopause —
          and the science each piece still makes possible.
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem' }}>
          <MagneticButton
            href="#fleet"
            onMouseEnter={() => setLabel('EXPLORE')}
            onMouseLeave={() => setLabel('')}
          >
            OPEN THE ARCHIVE
          </MagneticButton>
          <MagneticButton
            href="#deep"
            className="ghost"
            style={{ background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line-bright)' }}
            onMouseEnter={() => setLabel('PLAY')}
            onMouseLeave={() => setLabel('')}
          >
            TRACK PIONEER 10
          </MagneticButton>
        </div>
      </div>
      <div className="hero-scroll-cue" aria-hidden>
        <span>SCROLL</span>
        <span className="streak"><i /></span>
      </div>
      <div className="hud-corners" style={{ position:'absolute', inset:'80px 24px 24px', pointerEvents:'none' }} aria-hidden>
        <span className="hc tl blink" /><span className="hc tr" /><span className="hc bl" /><span className="hc br blink" />
      </div>
    </section>
  )
}

function useCursorSafe() {
  try { return useCursor() } catch { return { setLabel: () => {}, setVisible: () => {} } }
}

function Prologue() {
  const ref = useRef(null)
  const progress = useSmoothScrollProgress(ref, { offset: ['start start', 'end end'] })
  const y1 = useTransform(progress, [0, 1], [0, -40])
  const y2 = useTransform(progress, [0, 1], [0, -80])
  const y3 = useTransform(progress, [0, 1], [0, -120])
  const o1 = useTransform(progress, [0, 0.2, 0.35], [0, 1, 1])
  const o2 = useTransform(progress, [0.25, 0.45, 0.6], [0, 1, 1])
  const o3 = useTransform(progress, [0.5, 0.7, 0.9], [0, 1, 1])

  return (
    <section className="section" id="prologue" ref={ref} style={{ minHeight: '180vh' }}>
      <span className="section-rail">01 · PROLOGUE</span>
      <motion.span className="section-num" style={{ y: useTransform(progress, [0,1], [0, 80]) }}>01</motion.span>
      <div style={{ position:'sticky', top: '20vh', maxWidth: 780 }}>
        <p className="kicker" style={{ marginBottom: '1rem' }}>
          <ScrambleLine text="TRANSMISSION · EARTH ARCHIVE" active />
        </p>
        <motion.h2 className="display" style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', marginBottom: '2rem', y: y1, opacity: o1 }}>
          They stayed behind<br />
          <span className="outline-text">so we could learn.</span>
        </motion.h2>
        <motion.div style={{ y: y2, opacity: o2, marginBottom: '1.5rem' }}>
          <LineReveal>
            <span style={{ color:'var(--ink-dim)', fontSize:'1.15rem', lineHeight:1.7, display:'block' }}>
              Since the 1960s, NASA has left hardware across the solar system — landers, rovers,
              experiment packages, and probes that finished their missions or simply kept going.
              The NASA Catalogue of Manmade Material on the Moon alone lists 796 items.
            </span>
          </LineReveal>
        </motion.div>
        <motion.div style={{ y: y3, opacity: o3 }}>
          <LineReveal delay={0.1}>
            <span style={{ color:'var(--ink-dim)', fontSize:'1.15rem', lineHeight:1.7, display:'block' }}>
              This is their dossier: school-age space fans welcome. Every coordinate ties to NSSDCA,
              LROC, ALSJ, HiRISE, or PDS. The silent fleet is not trash. It is unfinished science —
              and unfinished stories.
            </span>
          </LineReveal>
        </motion.div>
      </div>
    </section>
  )
}

function FleetCard({ item, onOpen, velocity }) {
  const ref = useRef(null)
  const { setLabel } = useCursorSafe()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const skew = useTransform(velocity, (v) => clamp(v / 800, -4, 4))
  const bodyColor = item.body === 'mars' ? 'var(--rust)' : item.body === 'deep' ? 'var(--gold)' : 'var(--ice)'

  return (
    <motion.article
      ref={ref}
      className="fleet-card glass-2 corner-brackets holo-foil"
      style={{ skewX: skew, '--chip': bodyColor }}
      whileHover={{ scale: 1.03 }}
      tabIndex={0}
      role="button"
      aria-label={`Open dossier ${item.name}`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } }}
      onMouseEnter={() => setLabel('OPEN FILE')}
      onMouseLeave={() => { setLabel(''); setTilt({ x:0, y:0 }) }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        setTilt({ x: (py - 0.5) * -10, y: (px - 0.5) * 12 })
        ref.current.style.setProperty('--gx', `${px*100}%`)
        ref.current.style.setProperty('--gy', `${py*100}%`)
      }}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', ...SPRING_SOFT }}
    >
      <div className="glare" />
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <span className="data-chip" style={{ '--chip': bodyColor }}>{item.mission}</span>
          <span className={`status-dot ${item.status === 'ACTIVE' ? 'live' : item.status === 'COASTING' ? 'coast' : ''}`} title={item.status} />
        </div>
        <h3 className="display" style={{ fontSize:'1.55rem', marginBottom:'0.4rem' }}>{item.name}</h3>
        <p className="mono" style={{ fontSize:'0.65rem', letterSpacing:'0.12em', color:'var(--ink-mute)' }}>{item.codename}</p>
      </div>
      <div>
        <p style={{ color:'var(--ink-dim)', fontSize:'0.92rem', lineHeight:1.5, marginBottom:'1rem' }}>{item.science.slice(0, 110)}…</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
          {item.tags.map((t) => (
            <span key={t} className="mono" style={{ fontSize:'0.6rem', letterSpacing:'0.1em', padding:'0.25rem 0.5rem', border:'1px solid var(--line)', borderRadius:6 }}>{t}</span>
          ))}
        </div>
      </div>
    </motion.article>
  )
}

function Fleet({ onOpen }) {
  const track = useRef(null)
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const { setLabel } = useCursorSafe()
  const [rail, setRail] = useState(0)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth
      setRail(max > 0 ? el.scrollLeft / max : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="section" id="fleet" style={{ paddingRight: 0, paddingLeft: 0 }}>
      <div style={{ padding: '0 clamp(1.25rem, 4vw, 4rem)' }}>
        <span className="section-rail">02 · FLEET</span>
        <span className="section-num">02</span>
        <p className="kicker"><ScrambleLine text="HORIZONTAL DOSSIER · DRAG TO SURVEY" active /></p>
        <h2 className="display" style={{ fontSize:'clamp(2.2rem, 6vw, 4rem)', margin:'0.75rem 0 0.5rem' }}>
          Fifteen files.<br /><span className="outline-text">One silent fleet.</span>
        </h2>
      </div>
      <div
        className="fleet-track"
        ref={track}
        onMouseEnter={() => setLabel('DRAG')}
        onMouseLeave={() => setLabel('')}
        style={{ paddingLeft: 'clamp(1.25rem, 4vw, 4rem)', paddingRight: 'clamp(1.25rem, 4vw, 4rem)' }}
      >
        {ARTIFACTS.map((a) => (
          <FleetCard key={a.id} item={a} onOpen={onOpen} velocity={velocity} />
        ))}
      </div>
      <div style={{ padding: '0 clamp(1.25rem, 4vw, 4rem)' }}>
        <div className="fleet-rail" aria-hidden>
          <i style={{ left: `calc(${rail * 100}% - 4px)` }} />
        </div>
      </div>
    </section>
  )
}

function Archive({ onOpen }) {
  const [filter, setFilter] = useState('all')
  const { setLabel } = useCursorSafe()
  const filtered = useMemo(() => {
    return ARTIFACTS.filter((a) => {
      if (filter === 'all') return true
      if (filter === 'active') return a.status === 'ACTIVE' || a.status === 'COASTING'
      return a.body === filter
    })
  }, [filter])
  const activeIdx = FILTERS.findIndex((f) => f.id === filter)

  return (
    <section className="section" id="archive">
      <span className="section-rail">03 · ARCHIVE</span>
      <span className="section-num">03</span>
      <p className="kicker"><ScrambleLine text="FILTERED INDEX · NSSDCA CROSSWALK" active /></p>
      <h2 className="display" style={{ fontSize:'clamp(2rem, 5vw, 3.5rem)', margin:'0.75rem 0 0' }}>
        Browse the <span className="grad-text">discarded</span>
      </h2>
      <div className="archive-filters glass-1" role="tablist" aria-label="Body filter">
        <motion.div
          className="indicator"
          animate={{ x: activeIdx * 88, width: 84 }}
          transition={{ type: 'spring', ...SPRING }}
          style={{ width: 84 }}
        />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{ color: filter === f.id ? 'var(--ink)' : undefined, minWidth: 84 }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <motion.div className="archive-grid" layout>
        <AnimatePresence mode="popLayout">
          {filtered.map((a) => (
            <motion.button
              layout
              key={a.id}
              className="archive-card glass-2 corner-brackets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', ...SPRING_SOFT }}
              onClick={() => onOpen(a)}
              onMouseEnter={() => setLabel('OPEN FILE')}
              onMouseLeave={() => setLabel('')}
              aria-label={`Open ${a.name}`}
              style={{ textAlign:'left', width:'100%' }}
            >
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span className="mono" style={{ fontSize:'0.65rem', color:'var(--ink-mute)' }}>{a.year} · {a.body.toUpperCase()}</span>
                <span className={`status-dot ${a.status === 'ACTIVE' ? 'live' : a.status === 'COASTING' ? 'coast' : ''}`} />
              </div>
              <h3 className="display" style={{ fontSize:'1.3rem' }}>{a.name}</h3>
              <p style={{ color:'var(--ink-dim)', fontSize:'0.88rem', lineHeight:1.5, flex:1 }}>{a.story.slice(0, 120)}…</p>
              <span className="data-chip" style={{ '--chip': a.body === 'mars' ? 'var(--rust)' : a.body === 'deep' ? 'var(--gold)' : 'var(--ice)' }}>{a.coords}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}


function ArtifactModal({ item, onClose }) {
  const [phase, setPhase] = useState(0)
  const reduced = usePrefersReduced()

  useEffect(() => {
    if (!item) return
    setPhase(0)
    const timers = [
      setTimeout(() => setPhase(1), reduced ? 50 : 280),
      setTimeout(() => setPhase(2), reduced ? 100 : 520),
      setTimeout(() => setPhase(3), reduced ? 150 : 900),
    ]
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [item, onClose, reduced])

  if (!item) return null
  const chip = item.body === 'mars' ? 'var(--rust)' : item.body === 'deep' ? 'var(--gold)' : 'var(--ice)'
  const cells = [
    ['MISSION', item.mission],
    ['YEAR', String(item.year)],
    ['STATUS', item.status],
    ['COORDS', item.coords],
    ['MASS', item.mass],
    ['DURATION', item.duration],
  ]

  return createPortal(
    <motion.div
      className="modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div className="modal-backdrop" onClick={onClose} initial={{ opacity:0 }} animate={{ opacity:1 }} />
      <motion.div
        className="modal-wipe"
        initial={{ clipPath: 'inset(0 0 0 0)' }}
        animate={{ clipPath: 'inset(0 0 100% 0)' }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
      />
      <motion.div
        className="modal-panel glass-4 holo-foil scanlines"
        initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 40, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 20, transition: { duration: 0.35 * 0.7 } }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <button className="modal-close glass-1" onClick={onClose} aria-label="Close dossier">×</button>
        <motion.p className="kicker" initial={{ opacity:0 }} animate={{ opacity: phase>=1?1:0 }}>
          DOSSIER · {item.id.toUpperCase()}
        </motion.p>
        <motion.h2 id="dossier-title" className="display" style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', margin:'0.5rem 0' }}
          initial={{ opacity:0, y:12 }} animate={{ opacity: phase>=1?1:0, y:0 }}>
          {item.name}
        </motion.h2>
        <motion.div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1.25rem' }}
          initial={{ opacity:0 }} animate={{ opacity: phase>=1?1:0 }}>
          <span className={`status-dot ${item.status==='ACTIVE'?'live':item.status==='COASTING'?'coast':''}`} />
          <span className="mono" style={{ fontSize:'0.7rem', letterSpacing:'0.14em' }}>{item.status} · {item.codename}</span>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.6rem', marginBottom:'1.5rem' }}>
          {cells.map(([k,v], i) => (
            <motion.div
              key={k}
              className="data-chip"
              style={{ '--chip': chip, display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, padding:'0.65rem' }}
              initial={{ opacity:0, y:8 }}
              animate={{ opacity: phase>=2?1:0, y: phase>=2?0:8 }}
              transition={{ delay: i * 0.04 }}
            >
              <span style={{ opacity:0.6 }}>{k}</span>
              <span style={{ color:'var(--ink)', fontSize:'0.72rem' }}>{v}</span>
            </motion.div>
          ))}
        </div>
        {phase >= 2 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: 0.15 }}>
            <h3 className="mono" style={{ fontSize:'0.65rem', letterSpacing:'0.16em', color:'var(--ink-mute)', marginBottom:8 }}>SCIENCE</h3>
            <p style={{ color:'var(--ink-dim)', lineHeight:1.65, marginBottom:'1rem' }}>{item.science}</p>
            <h3 className="mono" style={{ fontSize:'0.65rem', letterSpacing:'0.16em', color:'var(--ink-mute)', marginBottom:8 }}>STORY</h3>
            <p style={{ color:'var(--ink-dim)', lineHeight:1.7, marginBottom:'1.5rem' }}>{item.story}</p>
          </motion.div>
        )}
        {phase >= 3 && (
          <div className="glass-1" style={{ padding:'1rem', borderRadius:12 }}>
            <div className="mono" style={{ fontSize:'0.65rem', letterSpacing:'0.14em', color:'var(--rust)', marginBottom:8 }}>LAST TRANSMISSION</div>
            <Typewriter text={item.transmission} active speed={22} className="mono" style={{ fontSize:'0.9rem' }} />
          </div>
        )}
        <p className="mono" style={{ fontSize:'0.6rem', color:'var(--ink-mute)', marginTop:'1.5rem' }}>
          Sources: NSSDCA · LROC · NASA Catalogue of Manmade Material on the Moon · ALSJ · HiRISE · PDS
        </p>
      </motion.div>
    </motion.div>,
    document.body
  )
}

function Timeline() {
  const ref = useRef(null)
  const progress = useSmoothScrollProgress(ref, { offset: ['start 80%', 'end 20%'] })
  const cometY = useTransform(progress, [0, 1], ['0%', '100%'])

  return (
    <section className="section" id="timeline" ref={ref}>
      <span className="section-rail">04 · TIMELINE</span>
      <span className="section-num">04</span>
      <p className="kicker"><ScrambleLine text="24 BEACONS · 1958 → 2026" active /></p>
      <h2 className="display" style={{ fontSize:'clamp(2rem,5vw,3.5rem)', margin:'0.75rem 0 2.5rem' }}>
        A chronology of<br /><span className="outline-text">leaving things behind</span>
      </h2>
      <div className="timeline-wrap">
        <div className="timeline-line" aria-hidden />
        <motion.div className="timeline-comet" style={{ top: cometY }} aria-hidden />
        {TIMELINE.map((ev, i) => (
          <TimelineCard key={`${ev.year}-${ev.title}`} ev={ev} index={i} />
        ))}
      </div>
    </section>
  )
}

function TimelineCard({ ev, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = usePrefersReduced()
  return (
    <motion.article
      ref={ref}
      className="timeline-item"
      initial={reduced ? false : { opacity: 0, x: index % 2 ? 40 : -40, rotateY: 12 }}
      animate={inView ? { opacity: 1, x: 0, rotateY: 0 } : undefined}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <span className="timeline-dot" aria-hidden />
      <div className="mono" style={{ fontSize:'0.85rem', color:'var(--ice)' }}>
        <ScrambleLine text={ev.year} active={inView} />
      </div>
      <div className="glass-1" style={{ padding:'1rem 1.2rem', borderRadius:14 }}>
        <h3 className="display" style={{ fontSize:'1.15rem', marginBottom:6 }}>{ev.title}</h3>
        <p style={{ color:'var(--ink-dim)', fontSize:'0.92rem', lineHeight:1.55 }}>{ev.text}</p>
      </div>
    </motion.article>
  )
}

function Marquee() {
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const skew = useTransform(velocity, (v) => clamp(v / 600, -6, 6))
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="marquee" aria-hidden>
      <motion.div
        className="marquee-row"
        style={{ skewX: skew }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((t, i) => (
          <span key={`a-${i}`}>{t}<span className="sep">✦</span></span>
        ))}
      </motion.div>
      <motion.div
        className="marquee-row"
        style={{ skewX: skew, marginTop: 8, opacity: 0.35, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}
        animate={{ x: ['-50%', '0%'] }}
        transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((t, i) => (
          <span key={`b-${i}`}>{t}<span className="sep">✦</span></span>
        ))}
      </motion.div>
    </div>
  )
}

function Voices() {
  const { setLabel } = useCursorSafe()
  return (
    <section className="section" id="voices">
      <span className="section-rail">05 · VOICES</span>
      <span className="section-num">05</span>
      <p className="kicker"><ScrambleLine text="SIX TRANSMISSIONS · ALSJ / JPL / SAGAN" active /></p>
      <h2 className="display" style={{ fontSize:'clamp(2rem,5vw,3.5rem)', margin:'0.75rem 0 2rem' }}>
        They spoke.<br /><span className="outline-text">The hardware listened.</span>
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1.25rem' }}>
        {VOICES.map((v, i) => (
          <VoiceCard key={v.id} voice={v} index={i} setLabel={setLabel} />
        ))}
      </div>
    </section>
  )
}

function VoiceCard({ voice, index, setLabel }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  return (
    <motion.article
      ref={ref}
      className="voice-card glass-2 corner-brackets"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      transition={{ delay: index * 0.05, type: 'spring', ...SPRING_SOFT }}
      onMouseEnter={() => setLabel('PLAY')}
      onMouseLeave={() => setLabel('')}
    >
      <span className="ghost-q" aria-hidden>“</span>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
        <div className="signal-bars" aria-hidden><i/><i/><i/><i/><i/></div>
        <span className="mono" style={{ fontSize:'0.6rem', letterSpacing:'0.12em', color:'var(--ink-mute)' }}>FILE ↗</span>
      </div>
      <p style={{ fontSize:'1.05rem', lineHeight:1.55, marginBottom:'1.25rem', minHeight:'4.5em' }}>
        {inView ? <Typewriter text={`“${voice.quote}”`} active speed={12} /> : null}
      </p>
      <div>
        <div className="display" style={{ fontSize:'1rem' }}>{voice.who}</div>
        <div className="mono" style={{ fontSize:'0.65rem', color:'var(--ink-mute)', marginTop:4 }}>{voice.role} · {voice.file}</div>
        <p style={{ color:'var(--ink-dim)', fontSize:'0.85rem', marginTop:8 }}>{voice.context}</p>
      </div>
    </motion.article>
  )
}

function Stats() {
  return (
    <section className="section" id="stats">
      <span className="section-rail">06 · METRICS</span>
      <span className="section-num">06</span>
      <p className="kicker"><ScrambleLine text="INSTRUMENT CLUSTER · LIVE READOUTS" active /></p>
      <h2 className="display" style={{ fontSize:'clamp(2rem,5vw,3.2rem)', margin:'0.75rem 0 2rem' }}>
        Numbers that still<br /><span className="grad-text">tick in the dark</span>
      </h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem' }}>
        {STATS.map((s) => (
          <div key={s.id} className="stat-cell glass-2">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <span className="mono" style={{ fontSize:'0.65rem', letterSpacing:'0.12em', color:'var(--ink-mute)' }}>{s.label}</span>
              <Sparkline data={s.spark} color={s.id === 's3' || s.id === 's6' ? 'var(--rust)' : 'var(--ice)'} />
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <Odometer value={s.value} digits={String(Math.floor(s.value)).length} />
              <span className="mono" style={{ fontSize:'1rem', color:'var(--ink-dim)' }}>{s.suffix}</span>
            </div>
            <span className="mono" style={{ fontSize:'0.65rem', color:'var(--ink-mute)' }}>{s.unit}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function MoonMap({ onOpen }) {
  const [hover, setHover] = useState(null)
  const [zoom, setZoom] = useState(null)
  const { setLabel } = useCursorSafe()
  const pins = MOON_PINS

  const toXY = (lat, lon) => {
    // orthographic-ish projection onto disc
    const x = ((lon + 180) / 360) * 100
    const y = ((90 - lat) / 180) * 100
    return { left: `${clamp(x, 8, 92)}%`, top: `${clamp(y, 8, 92)}%` }
  }

  const openPin = (pin) => {
    const art = ARTIFACTS.find((a) => a.id === pin.id)
    setZoom(pin.id)
    setTimeout(() => {
      if (art) onOpen(art)
      setZoom(null)
    }, 480)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!['ArrowLeft','ArrowRight','Enter'].includes(e.key)) return
      const idx = hover ? pins.findIndex((p) => p.id === hover.id) : -1
      if (e.key === 'ArrowRight') {
        const n = pins[(idx + 1 + pins.length) % pins.length]
        setHover(n)
      } else if (e.key === 'ArrowLeft') {
        const n = pins[(idx - 1 + pins.length) % pins.length]
        setHover(n)
      } else if (e.key === 'Enter' && hover) {
        openPin(hover)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hover, pins])

  const hp = hover ? toXY(hover.lat, hover.lon) : null

  return (
    <section className="section" id="moon">
      <span className="section-rail">07 · LUNAR MAP</span>
      <span className="section-num">07</span>
      <p className="kicker"><ScrambleLine text="LROC ANCHOR POINTS · MEAN EARTH / POLAR AXIS" active /></p>
      <h2 className="display" style={{ fontSize:'clamp(2rem,5vw,3.5rem)', margin:'0.75rem 0 2rem' }}>
        Nearside beacons<br /><span className="outline-text">still on the limb</span>
      </h2>
      <div className="moon-map-wrap">
        <motion.div
          className="moon-disc blueprint-grid"
          animate={zoom ? { scale: 1.35, x: 20, y: -10 } : { scale: 1, x: 0, y: 0 }}
          transition={{ type: 'spring', ...SPRING }}
          role="img"
          aria-label="Interactive map of NASA hardware sites on the Moon"
        >
          <div className="tycho" aria-hidden />
          {hover && hp && (
            <div className="moon-crosshair" aria-hidden>
              <span style={{ left: hp.left, top: 0, bottom: 0, width: 1, transform:'translateX(-0.5px)' }} />
              <span style={{ top: hp.top, left: 0, right: 0, height: 1, transform:'translateY(-0.5px)' }} />
            </div>
          )}
          {pins.map((p) => {
            const pos = toXY(p.lat, p.lon)
            return (
              <button
                key={p.id}
                className={`moon-pin ${p.status === 'ACTIVE' ? 'live' : ''}`}
                style={{ left: pos.left, top: pos.top }}
                aria-label={`${p.mission} ${p.name}`}
                onMouseEnter={() => { setHover(p); setLabel('EXPLORE') }}
                onMouseLeave={() => { setHover(null); setLabel('') }}
                onFocus={() => setHover(p)}
                onClick={() => openPin(p)}
              />
            )
          })}
          {hover && (
            <div className="moon-tooltip glass-3" style={{ left: hp.left, top: `calc(${hp.top} + 16px)`, transform:'translateX(-50%)' }}>
              <div className="mono" style={{ fontSize:'0.6rem', color:'var(--ice)', marginBottom:4 }}>{hover.mission}</div>
              <div className="display" style={{ fontSize:'0.95rem' }}>{hover.name}</div>
              <Typewriter text={hover.note} active speed={20} className="mono" style={{ fontSize:'0.65rem', color:'var(--ink-dim)' }} />
            </div>
          )}
        </motion.div>
        <div className="glass-2 scanlines" style={{ padding:'1.5rem', borderRadius:18 }}>
          <div className="kicker" style={{ marginBottom:12 }}>SITE TELEMETRY</div>
          {hover ? (
            <>
              <h3 className="display" style={{ fontSize:'1.6rem', marginBottom:8 }}>{hover.name}</h3>
              <p className="mono" style={{ fontSize:'0.75rem', color:'var(--ink-dim)', marginBottom:12 }}>{hover.coords}</p>
              <p style={{ color:'var(--ink-dim)', lineHeight:1.6 }}>{hover.note}</p>
              <p className="mono" style={{ fontSize:'0.65rem', marginTop:16, color:'var(--ink-mute)' }}>
                STATUS · {hover.status} · ARROW KEYS TO STEP · ENTER TO OPEN
              </p>
            </>
          ) : (
            <p style={{ color:'var(--ink-dim)', lineHeight:1.6 }}>
              Hover or focus a beacon to pull LROC-anchored coordinates.
              Pins mark Apollo LM/ALSEP/LRV sites, Surveyor 3, and active LRRR arrays
              from the NASA Catalogue of Manmade Material on the Moon.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function PioneerPlaqueSVG() {
  return (
    <svg viewBox="0 0 200 140" width="100%" style={{ maxWidth: 280 }} aria-hidden>
      <rect x="4" y="4" width="192" height="132" rx="4" fill="#1a140c" stroke="#ffb347" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="#ffb347" strokeWidth="1" opacity="0.7" />
      <circle cx="50" cy="50" r="2" fill="#ffb347" />
      <path d="M50 28 L50 72 M28 50 L72 50" stroke="#ffb347" strokeWidth="0.6" opacity="0.5" />
      <path d="M110 30 L150 40 L145 80 L115 75 Z" fill="none" stroke="#ffb347" strokeWidth="1" />
      <circle cx="130" cy="55" r="8" fill="none" stroke="#ffb347" strokeWidth="0.8" />
      <path d="M160 100 Q170 90 180 100" fill="none" stroke="#ffb347" strokeWidth="1" />
      <text x="100" y="120" textAnchor="middle" fill="#ffb347" fontFamily="IBM Plex Mono" fontSize="7" letterSpacing="2">PIONEER PLAQUE · 1972</text>
    </svg>
  )
}

function DeepSpace() {
  const au = usePioneerDistance()
  const km = au * 149597870.7
  return (
    <section className="section" id="deep" style={{ minHeight: '100vh', overflow:'hidden' }}>
      <DeepSpaceCanvas />
      <div style={{ position:'relative', zIndex:2 }}>
        <span className="section-rail">08 · DEEP SPACE</span>
        <span className="section-num">08</span>
        <p className="kicker"><ScrambleLine text="PIONEER 10 · LIVE HELIOCENTRIC COUNTER" active /></p>
        <h2 className="display" style={{ fontSize:'clamp(2rem,5vw,3.5rem)', margin:'0.75rem 0 1.5rem', maxWidth: 640 }}>
          Still outbound.<br /><span className="outline-text">Still carrying us.</span>
        </h2>
        <div className="deep-counters" style={{ marginBottom:'2rem', maxWidth: 800 }}>
          <div className="instrument glass-3">
            <div className="mono" style={{ fontSize:'0.6rem', letterSpacing:'0.14em', color:'var(--ink-mute)', marginBottom:8 }}>RANGE</div>
            <div className="val">{au.toFixed(6)} <sup>AU</sup></div>
          </div>
          <div className="instrument glass-3">
            <div className="mono" style={{ fontSize:'0.6rem', letterSpacing:'0.14em', color:'var(--ink-mute)', marginBottom:8 }}>KILOMETERS</div>
            <div className="val">{km.toExponential(4)} <sup>km</sup></div>
          </div>
          <div className="instrument glass-3">
            <div className="mono" style={{ fontSize:'0.6rem', letterSpacing:'0.14em', color:'var(--ink-mute)', marginBottom:8 }}>LIGHT-HOURS</div>
            <div className="val">{(au * 0.138).toFixed(3)} <sup>hr</sup></div>
          </div>
          <div className="instrument glass-3">
            <div className="mono" style={{ fontSize:'0.6rem', letterSpacing:'0.14em', color:'var(--ink-mute)', marginBottom:8 }}>LAST SIGNAL</div>
            <div className="val" style={{ fontSize:'1rem' }}>2003-01-23</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'2rem', alignItems:'center', maxWidth: 900 }}>
          <p style={{ color:'var(--ink-dim)', lineHeight:1.7, fontSize:'1.05rem' }}>
            Pioneer 10 was the first through the asteroid belt and the first to Jupiter.
            Its gold plaque — hydrogen hyperfine, nude figures, solar system map —
            is a message in a bottle for whoever might find it near Aldebaran in two million years.
            Voyager 1 now sails farther still, plasma-wave instrument whispering from interstellar space.
          </p>
          <div className="glass-2" style={{ padding:'1.25rem', borderRadius:16, display:'grid', placeItems:'center' }}>
            <PioneerPlaqueSVG />
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const utc = useUTCClock()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <footer className="footer" ref={ref}>
      <div className="footer-mark holo-foil">SILENT FLEET</div>
      <div className="footer-links">
        <a className="glass-2" href="https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/" target="_blank" rel="noreferrer">
          NASA SPACE APPS CHALLENGE ↗
        </a>
        <a className="glass-2" href="https://nssdc.gsfc.nasa.gov/nmc/" target="_blank" rel="noreferrer">
          NSSDCA MASTER CATALOG ↗
        </a>
        <a className="glass-2" href="https://lroc.im-ldi.com/images" target="_blank" rel="noreferrer">
          LROC IMAGE ARCHIVE ↗
        </a>
        <a className="glass-2" href="https://www.nasa.gov/wp-content/uploads/2024/02/final-catalogue-of-manmade-material-on-the-moon.pdf" target="_blank" rel="noreferrer">
          LUNAR MATERIAL CATALOGUE ↗
        </a>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:'1rem', alignItems:'end' }}>
        <div>
          <div className="mono" style={{ fontSize:'0.7rem', color:'var(--ink-mute)', marginBottom:8 }}>MISSION CLOCK · {utc}</div>
          <p className="mono" style={{ fontSize:'0.85rem', letterSpacing:'0.08em' }}>
            <ScrambleLine text="THEY ARE STILL OUT THERE." active={inView} />
            <span className="status-dot live" style={{ marginLeft:10, verticalAlign:'middle' }} />
          </p>
          <p style={{ color:'var(--ink-mute)', fontSize:'0.75rem', marginTop:12, maxWidth:520, lineHeight:1.5 }}>
            Built for NASA Space Apps 2026 — “Abandoned but not Forgotten.”
            Facts cross-checked against NSSDCA, LROC, ALSJ, HiRISE & PDS.
            Procedural visuals · AI-assisted code disclosed per challenge guidelines.
          </p>
        </div>
        <MagneticButton href="#top">RETURN TO SURFACE</MagneticButton>
      </div>
    </footer>
  )
}


/* ═══════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════ */

function CursorProvider({ children }) {
  const coarse = useIsCoarse()
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(true)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, { stiffness: 550, damping: 40 })
  const ry = useSpring(y, { stiffness: 550, damping: 40 })
  const ringX = useSpring(x, { stiffness: 160, damping: 24 })
  const ringY = useSpring(y, { stiffness: 160, damping: 24 })

  useEffect(() => {
    document.body.classList.toggle('is-coarse', coarse)
  }, [coarse])

  useEffect(() => {
    if (coarse) return
    const move = (e) => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [coarse, x, y])

  const api = useMemo(() => ({ setLabel, setVisible }), [])

  return (
    <CursorCtx.Provider value={api}>
      {children}
      {!coarse && visible && createPortal(
        <div className={`sf-cursor ${label ? 'has-label' : ''}`} aria-hidden>
          <motion.div style={{ position:'fixed', left:0, top:0, x: rx, y: ry, width:6, height:6, borderRadius:'50%', background:'#fff', marginLeft:-3, marginTop:-3, pointerEvents:'none', zIndex:10001, mixBlendMode:'difference' }} />
          <motion.div style={{
            position:'fixed', left:0, top:0, x: ringX, y: ringY,
            width: label ? 'auto' : 36, height: label ? 'auto' : 36,
            marginLeft: label ? 0 : -18, marginTop: label ? 0 : -18,
            border: label ? 'none' : '1px solid rgba(255,255,255,0.7)',
            borderRadius: 999,
            padding: label ? '0.45rem 0.75rem' : 0,
            background: label ? 'rgba(255,255,255,0.14)' : 'transparent',
            backdropFilter: label ? 'blur(12px)' : undefined,
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.16em',
            color: '#fff', whiteSpace: 'nowrap',
            display:'flex', alignItems:'center', justifyContent:'center',
            pointerEvents:'none', zIndex:10001, mixBlendMode:'difference',
            transform: label ? 'translate(-50%, -50%)' : undefined,
          }}>
            {label || null}
          </motion.div>
        </div>,
        document.body
      )}
    </CursorCtx.Provider>
  )
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState(null)
  const mainRef = useRef(null)
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 28 })
  const heroRef = useRef(null)
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroSmooth = useSpring(heroProg, { stiffness: 120, damping: 30 })

  useEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-sf', 'global')
    style.textContent = GLOBAL_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  const onBootDone = useCallback(() => {
    setBooting(false)
    requestAnimationFrame(() => setReady(true))
  }, [])

  return (
    <CursorProvider>
      <div className="sf-app" ref={mainRef}>
        <div className="sf-grid-bg" aria-hidden />
        <a href="#prologue" className="mono" style={{
          position:'absolute', left:-9999, top:'auto', width:1, height:1, overflow:'hidden',
        }}
          onFocus={(e) => { e.currentTarget.style.left = '12px'; e.currentTarget.style.top = '12px'; e.currentTarget.style.width='auto'; e.currentTarget.style.height='auto'; e.currentTarget.style.zIndex=200; e.currentTarget.style.padding='8px 12px'; e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#000' }}
        >Skip to content</a>

        <AnimatePresence>
          {booting && <Preloader onDone={onBootDone} />}
        </AnimatePresence>

        <Nav progress={smoothProgress} />

        <div ref={heroRef}>
          <ErrorBoundary fallback={<section className="hero"><div className="canvas-fallback" /><div className="hero-content"><h1 className="display display-xl">SILENT FLEET</h1></div></section>}>
            <Hero scrollProgress={heroSmooth} ready={ready && !booting} />
          </ErrorBoundary>
        </div>

        <ErrorBoundary fallback={<section className="section" id="prologue"><h2>Prologue</h2></section>}>
          <Prologue />
        </ErrorBoundary>

        <Marquee />

        <ErrorBoundary>
          <Fleet onOpen={setSelected} />
        </ErrorBoundary>

        <ErrorBoundary>
          <Archive onOpen={setSelected} />
        </ErrorBoundary>

        <ErrorBoundary>
          <MoonMap onOpen={setSelected} />
        </ErrorBoundary>

        <ErrorBoundary>
          <Timeline />
        </ErrorBoundary>

        <Marquee />

        <ErrorBoundary>
          <Voices />
        </ErrorBoundary>

        <ErrorBoundary>
          <Stats />
        </ErrorBoundary>

        <ErrorBoundary>
          <DeepSpace />
        </ErrorBoundary>

        <Footer />

        <AnimatePresence>
          {selected && (
            <ArtifactModal item={selected} onClose={() => setSelected(null)} />
          )}
        </AnimatePresence>

        <div className="mono" style={{
          position:'fixed', bottom:12, right:12, zIndex:40,
          fontSize:'0.55rem', letterSpacing:'0.12em', color:'var(--ink-mute)',
          opacity:0.6, pointerEvents:'none',
        }}>
          AI-ASSISTED · NASA SPACE APPS 2026
        </div>
      </div>
    </CursorProvider>
  )
}

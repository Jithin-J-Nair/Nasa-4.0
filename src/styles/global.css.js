export const GLOBAL_CSS = `
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

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
  --violet: #4a6a8a;
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
  background: transparent;
  overflow-x: clip;
}
.continuum-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.continuum-canvas.is-hotspots {
  z-index: 3;
  pointer-events: none;
}
.continuum-canvas.is-hotspots canvas {
  pointer-events: none;
}
.sf-chapters {
  position: relative;
  z-index: 2;
}
.sf-veil {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(3,3,8,0.35) 0%, rgba(3,3,8,0.04) 32%, rgba(3,3,8,0.08) 68%, rgba(3,3,8,0.55) 100%),
    radial-gradient(ellipse at 62% 48%, transparent 22%, rgba(3,3,8,0.28) 100%);
}
.audio-toggle {
  position: fixed;
  right: 14px;
  bottom: 44px;
  z-index: 90;
  padding: 0.55rem 0.85rem;
  border-radius: 2px;
  border: 1px solid var(--line);
  background: transparent;
  backdrop-filter: blur(14px);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  color: var(--ink-dim);
  transition: color 0.3s, border-color 0.3s, background 0.3s;
}
.audio-toggle.on {
  color: var(--ice);
  border-color: rgba(142,200,255,0.45);
  background: rgba(142,200,255,0.08);
}
.journey-spacer {
  height: 520vh;
  pointer-events: none;
}
.chapter-thin {
  padding-top: clamp(3rem, 8vw, 5rem);
  padding-bottom: clamp(3rem, 8vw, 5rem);
}
.dossier-rail {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 1rem 0 1.5rem;
  scrollbar-width: none;
}
.dossier-rail::-webkit-scrollbar { display: none; }
.dossier-chip {
  flex: 0 0 auto;
  scroll-snap-align: start;
  min-width: min(78vw, 280px);
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(10,10,18,0.42);
  backdrop-filter: blur(16px);
  text-align: left;
}
.dossier-chip .tx {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0.35rem 0 0.5rem;
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
.glass-0,.glass-1,.glass-2,.glass-3,.glass-4 {
  border: 1px solid rgba(232,238,245,0.1);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.03) inset,
    0 18px 40px -22px rgba(0,0,0,0.7);
}
.holo-foil { position: relative; overflow: hidden; }

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
  font-size: clamp(3.8rem, 16vw, 13rem);
  letter-spacing: -0.04em;
  line-height: 0.86;
  /* Protect trailing glyphs (T in SILENT / FLEET) from clip + negative tracking */
  padding-inline-end: 0.12em;
  overflow: visible;
}
.display-xxl {
  font-size: clamp(4.2rem, 18vw, 15rem);
  letter-spacing: -0.045em;
  line-height: 0.84;
  padding-inline-end: 0.12em;
  overflow: visible;
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
  /* background-clip:text eats trailing glyph ink without end pad */
  padding-inline-end: 0.08em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
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
  z-index: 0;
  font-family: var(--font-display);
  font-size: clamp(4rem, 14vw, 12rem);
  font-weight: 800;
  color: rgba(232,238,245,0.03);
  line-height: 1;
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.06em;
  mix-blend-mode: normal;
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
  background: linear-gradient(90deg, var(--ice), var(--rust));
  box-shadow: 0 0 10px rgba(142,200,255,0.35);
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
  padding: calc(var(--nav-h) + 2rem) clamp(1.25rem, 5vw, 5rem) 6rem;
  overflow: visible;
  background: transparent;
  perspective: 1200px;
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: min(1100px, 72vw);
  overflow: visible;
}
@media (max-width: 900px) {
  .hero-content { max-width: 100%; }
}
.hero-content h1 {
  margin-bottom: 1.35rem !important;
  max-width: none;
  width: max-content;
  max-width: 100%;
  transform-style: preserve-3d;
  overflow: visible;
}
.hero-content p { margin-bottom: 1.75rem !important; }
.hero-line {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: visible;
  padding-inline-end: 0.1em;
  will-change: transform, opacity, filter;
}
.hero-line .gradient-text,
.hero-line .gradient-text__content,
.hero-gradient-fleet {
  display: block;
  width: max-content;
  max-width: 100%;
  padding-inline-end: 0.1em;
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
}
.hero-line.hero-line--blur {
  display: flex;
}
.hero-body-blur {
  color: var(--ink-dim) !important;
  font-size: clamp(1.05rem, 2.4vw, 1.3rem);
  line-height: 1.5;
  margin: 0;
}
.challenge-motto {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(1.15rem, 2.8vw, 1.85rem);
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--ice);
  margin: 0 0 1rem;
  max-width: 22ch;
}
.hero-leftover {
  /* Brand left · leftover plate on the Moon (stage-right) */
  position: absolute;
  z-index: 3;
  right: clamp(1.1rem, 4vw, 4.5rem);
  bottom: clamp(5.5rem, 14vh, 7.5rem);
  display: block;
  width: min(34vw, 340px);
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: none;
  pointer-events: auto;
}
body.is-coarse .hero-leftover { cursor: pointer; }
.hero-leftover-media {
  margin-bottom: 0.45rem !important;
  aspect-ratio: 5 / 4;
  border: 1px solid var(--line-bright);
  box-shadow: 0 24px 60px -28px rgba(0, 0, 0, 0.85);
}
.hero-leftover-caption {
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  color: var(--ink-mute);
}
@media (max-width: 900px) {
  .hero-leftover {
    position: relative;
    right: auto;
    bottom: auto;
    width: min(100%, 360px);
    margin-top: 1.5rem;
  }
}
.challenge-objective {
  position: relative;
  padding-top: clamp(4rem, 12vh, 7rem);
  /* Clear gap before Atlas so Objective plate doesn’t bleed into the moon frame */
  padding-bottom: clamp(5rem, 18vh, 9rem);
}
.objective-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: start;
  margin-top: 0.5rem;
}
.objective-copy { max-width: 54ch; }
.objective-link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  margin-top: 1.75rem;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
}
.objective-link-row a { color: var(--ice); }
.objective-link-row a:hover { color: var(--ink); }
.objective-figure { margin: 0; }
.objective-figure figcaption {
  margin-top: 0.65rem;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: var(--ink-mute);
}
.heartbeat-media {
  margin-bottom: 0.85rem !important;
  aspect-ratio: 16 / 10;
  border-radius: 0;
}
@media (max-width: 860px) {
  .objective-grid { grid-template-columns: 1fr; }
  .objective-figure { max-width: 420px; }
}
.nasa-media.body-moon img { object-position: 50% 42%; }
.nasa-media.body-mars img { object-position: 50% 55%; }
.nasa-media.body-deep img { object-position: 50% 40%; }

.location-atlas {
  position: relative;
  z-index: 2;
  /* One full viewport — heading + moon + sites read together */
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  padding: calc(var(--nav-h) + 1rem) clamp(1.25rem, 5vw, 5rem) 1.5rem;
  box-sizing: border-box;
  /* Soft veil — Continuum Moon stays the centered stage */
  background:
    linear-gradient(180deg, rgba(3,3,8,0.32) 0%, rgba(3,3,8,0.1) 40%, rgba(3,3,8,0.2) 100%);
  overflow: hidden;
}
.atlas-overlay {
  position: relative;
  z-index: 4;
  max-width: min(460px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  height: 100%;
  min-height: 0;
}
.atlas-overlay--flow {
  pointer-events: auto;
}
.location-atlas.is-active .atlas-overlay--flow {
  visibility: hidden;
  pointer-events: none;
}
.atlas-overlay--hud {
  position: fixed;
  top: calc(var(--nav-h) + 0.75rem);
  left: clamp(1.25rem, 5vw, 5rem);
  bottom: 1.25rem;
  z-index: 6;
  max-width: min(420px, 86vw);
  pointer-events: none;
}
.atlas-overlay--hud .atlas-tabs,
.atlas-overlay--hud .atlas-site-list,
.atlas-overlay--hud .atlas-site {
  pointer-events: auto;
}
.atlas-heading {
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
}
.atlas-title {
  font-size: clamp(2.1rem, 5vw, 3.5rem);
  margin: 0.45rem 0 0.55rem;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}
.atlas-lede {
  color: var(--ink-dim);
  max-width: 40ch;
  line-height: 1.5;
  margin: 0;
  font-size: 0.95rem;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}
.atlas-tabs {
  display: inline-flex;
  gap: 0.35rem;
  margin-bottom: 1rem;
  padding: 0.3rem;
  border: 1px solid var(--line);
  background: rgba(7, 7, 12, 0.55);
}
.atlas-tabs button {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  padding: 0.55rem 0.9rem;
  color: var(--ink-mute);
  background: transparent;
  border: none;
}
.atlas-tabs button.on {
  color: var(--ink);
  background: rgba(142, 200, 255, 0.12);
}
.atlas-site-list {
  list-style: none;
  margin: 0;
  display: grid;
  gap: 0.3rem;
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(42vh, 360px);
  overflow: auto;
  padding: 0.45rem;
  scrollbar-width: thin;
  background: rgba(7, 7, 12, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
.atlas-overlay--hud .atlas-site-list {
  max-height: none;
}
.atlas-site {
  width: 100%;
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 0.75rem;
  align-items: start;
  text-align: left;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--line);
  background: rgba(7, 7, 12, 0.45);
  color: inherit;
  cursor: none;
}
body.is-coarse .atlas-site { cursor: pointer; }
.atlas-site:hover,
.atlas-site:focus-visible,
.atlas-site.active {
  border-color: rgba(142, 200, 255, 0.4);
  background: rgba(142, 200, 255, 0.08);
}
.atlas-site-dot {
  width: 8px;
  height: 8px;
  margin-top: 0.35rem;
  border-radius: 50%;
  background: var(--rust);
  box-shadow: 0 0 0 3px rgba(255, 122, 69, 0.18);
}
.atlas-site.live .atlas-site-dot {
  background: var(--ice);
  box-shadow: 0 0 0 3px rgba(142, 200, 255, 0.2);
}
.atlas-site-copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}
.atlas-site-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.98rem;
  letter-spacing: -0.02em;
}
.atlas-site-meta {
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: var(--ink-mute);
}
.atlas-telemetry {
  padding: 1.35rem 1.4rem;
  border-radius: 16px;
  min-height: 0;
}
.moon-hotspot {
  position: relative;
  width: 0;
  height: 0;
  pointer-events: none;
}
.moon-hotspot-hit {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(142, 200, 255, 0.28);
  box-shadow: 0 0 0 2px rgba(142, 200, 255, 0.1), 0 0 10px rgba(142, 200, 255, 0.22);
  pointer-events: auto;
  cursor: pointer;
  padding: 0;
  transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.moon-hotspot-hit.on,
.moon-hotspot-hit:hover,
.moon-hotspot-hit:focus-visible {
  background: rgba(142, 200, 255, 0.72);
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(142, 200, 255, 0.18), 0 0 14px rgba(142, 200, 255, 0.4);
  transform: scale(1.15);
  outline: none;
}
.moon-hotspot-card {
  position: absolute;
  left: 50%;
  top: 14px;
  transform: translateX(-50%);
  width: min(220px, 62vw);
  padding: 0.55rem 0.6rem 0.7rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 7, 12, 0.92);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.9);
  pointer-events: auto;
  text-align: left;
  color: var(--ink);
}
.moon-hotspot-card .nasa-media {
  margin-bottom: 0.55rem;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
}
.moon-hotspot-card .kicker {
  margin-bottom: 0.25rem;
  font-size: 0.55rem;
}
.moon-hotspot-card h3 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}
.moon-hotspot-card .coords {
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  color: var(--ink-mute);
  margin-bottom: 0.45rem;
}
.moon-hotspot-card .blurb {
  color: var(--ink-dim);
  font-size: 0.78rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.moon-hotspot-card .open {
  display: inline-block;
  margin-top: 0.55rem;
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  color: var(--ice);
}
.moon-pin.active {
  box-shadow: 0 0 0 1px rgba(142,200,255,0.55);
  z-index: 3;
}
.sf-spark-root {
  position: relative;
  width: 100%;
  min-height: 100%;
}
.heartbeat-focus {
  text-align: left;
  margin-bottom: 0.25rem;
}
.heartbeat-focus .focus-container {
  justify-content: flex-start;
  gap: 0.35em;
}
.heartbeat-focus .focus-word {
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 6vw, 4.2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
  color: var(--ink);
}
.heartbeat-spotlight {
  min-width: 0;
}
.heartbeat-spotlight .spotlight-card__border,
.heartbeat-spotlight .spotlight-card__edge {
  border-radius: 0;
}
.boot-bar {
  width: min(220px, 50vw);
  height: 2px;
  margin: 1.75rem auto 0;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  border-radius: 1px;
}
.boot-bar > i {
  display: block;
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, var(--ice), var(--rust));
  transform-origin: left;
}
.sf-cursor-trail {
  position: fixed;
  left: 0; top: 0;
  width: 10px; height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: rgba(142,200,255,0.35);
  pointer-events: none;
  z-index: 10000;
  mix-blend-mode: screen;
}
.heartbeats h2 {
  font-size: clamp(2.6rem, 9vw, 7rem) !important;
  max-width: 10ch !important;
  line-height: 0.9 !important;
  letter-spacing: -0.045em;
}
.heartbeat-row {
  margin-top: 2.5rem;
}
.section {
  background: transparent;
}
.connection-stage {
  min-height: 110vh;
  display: grid;
  align-content: center;
  gap: 2rem;
  max-width: 920px;
}
.connection-quote {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4.5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--ink);
}
.connection-meta {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  color: var(--ink-mute);
}
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
  flex: 0 0 min(78vw, 360px);
  scroll-snap-align: center;
  padding: 1.1rem;
  border-radius: 18px;
  min-height: 520px;
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
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.08),
    0 0 60px rgba(142,200,255,0.15);
}
.moon-disc .moon-surface {
  position: absolute; inset: 0; border-radius: 50%;
  background:
    url("/textures/moon_color_2k.jpg") center / 210% auto no-repeat,
    radial-gradient(circle at 32% 28%, #e8eef5 0%, #9aa7b8 18%, #5c6678 42%, #2a303c 70%, #0c0e14 100%);
  background-position: 42% 45%;
  box-shadow:
    inset -30px -20px 60px rgba(0,0,0,0.45),
    inset 20px 15px 40px rgba(255,255,255,0.08);
  animation: moonSpin 160s linear infinite;
  pointer-events: none;
  z-index: 0;
}
@keyframes moonSpin { to { transform: rotate(360deg); } }
.moon-disc .tycho {
  position: absolute; left: 58%; top: 72%; width: 8%; height: 8%; border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, rgba(255,255,255,0.2) 40%, transparent 70%);
  box-shadow: 0 0 20px rgba(255,255,255,0.25);
  pointer-events: none;
}
.moon-disc .tycho::before {
  content: ""; position: absolute; left: 50%; top: 50%; width: 600%; height: 600%;
  margin: -300% 0 0 -300%;
  background: conic-gradient(from 0deg, transparent 0 8%, rgba(255,255,255,0.07) 8% 9%, transparent 9% 20%, rgba(255,255,255,0.05) 20% 21%, transparent 21% 40%, rgba(255,255,255,0.06) 40% 41%, transparent 41% 100%);
}
.moon-pin {
  position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px;
  border-radius: 50%; background: transparent;
  border: none; padding: 0;
  z-index: 3;
  cursor: none;
  display: grid; place-items: center;
}
.moon-pin::before {
  content: "";
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--rust);
  box-shadow: 0 0 0 0 rgba(255,122,69,0.5);
  animation: sonar 2.2s ease-out infinite;
}
.moon-pin.live::before { background: var(--ice); box-shadow: 0 0 0 0 rgba(142,200,255,0.5); animation-name: sonarIce; }
.moon-pin:focus-visible { outline: 2px solid var(--ice); outline-offset: 2px; }
#moon h2 {
  position: relative;
  z-index: 2;
  isolation: isolate;
  mix-blend-mode: normal;
  text-shadow: 0 0 40px rgba(7,7,12,0.85);
}
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
  .moon-disc .moon-surface,
  .atlas-orb-surface { animation: none !important; }
}

.nasa-media {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  aspect-ratio: 16/10;
  background: #0a0a12;
  margin-bottom: 1rem;
}
.nasa-media img {
  width: 100%; height: 100%; object-fit: cover;
  filter: saturate(1.05) contrast(1.05);
  transition: transform 1.1s var(--ease), filter 0.6s;
}
.nasa-media:hover img, .archive-card:hover .nasa-media img, .fleet-card:hover .nasa-media img {
  transform: scale(1.06);
  filter: saturate(1.12) contrast(1.08);
}
.nasa-media .credit {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 0.55rem 0.7rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.75));
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  color: rgba(232,238,245,0.75);
}
.nasa-links {
  display: flex; flex-wrap: wrap; gap: 0.5rem;
  margin-top: 1rem;
}
.nasa-links a {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--line-bright);
  background: rgba(255,255,255,0.03);
  transition: background 0.3s, border-color 0.3s, color 0.3s;
}
.nasa-links a:hover, .nasa-links a:focus-visible {
  background: rgba(142,200,255,0.1);
  border-color: var(--ice);
  color: var(--ice);
}
.resources-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 2rem;
}
.section {
  transition: opacity 0.6s var(--ease);
}
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }

@media (max-width: 640px) {
  .timeline-item { grid-template-columns: 64px 1fr; }
  .fleet-card { flex-basis: min(86vw, 300px); min-height: 380px; }
  .display-xl { font-size: clamp(2.6rem, 14vw, 4.5rem); }
}

.heartbeats {
  padding: clamp(3rem, 8vw, 5rem) clamp(1.25rem, 4vw, 4rem);
}
.heartbeat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
@media (max-width: 720px) {
  .heartbeat-row { grid-template-columns: 1fr; }
}
.heartbeat-cell {
  background: rgba(7,7,12,0.72);
  backdrop-filter: blur(16px);
  padding: 1.35rem 1.25rem;
  text-align: left;
  transition: background 0.35s;
}
.heartbeat-cell:hover, .heartbeat-cell:focus-visible {
  background: rgba(14,18,28,0.9);
}
.heartbeat-cell .tx {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  margin: 0.45rem 0 0.55rem;
  line-height: 1.25;
}
.audio-toggle {
  right: 16px;
  bottom: 20px;
  letter-spacing: 0.2em;
  opacity: 0.7;
}
.audio-toggle:hover, .audio-toggle.on { opacity: 1; }
.sf-disclosure {
  position: fixed; bottom: 12px; right: 12px; z-index: 40;
  font-size: 0.55rem; letter-spacing: 0.12em; color: var(--ink-mute);
  opacity: 0.45; pointer-events: none;
  font-family: var(--font-mono);
}
@media (max-width: 640px) {
  .sf-disclosure { display: none; }
}
`

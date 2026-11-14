export const FLEET_SHELF_CSS = `
.fleet-folio {
  position: relative;
  z-index: 90;
  min-height: 100vh;
  min-height: 100dvh;
  /* Same ink as page — soft atmosphere only, no hard slab */
  background:
    radial-gradient(ellipse 75% 48% at 50% 28%, rgba(142, 200, 255, 0.055) 0%, transparent 58%),
    radial-gradient(ellipse 55% 40% at 78% 72%, rgba(255, 122, 69, 0.03) 0%, transparent 52%),
    linear-gradient(180deg, var(--bg) 0%, #06060b 42%, var(--bg) 100%);
  color: var(--ink);
  scroll-margin-top: var(--nav-h);
  overflow: hidden;
  padding: 0 0 clamp(2.5rem, 6vh, 4rem);
}
.fleet-folio::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(180deg, transparent 62%, rgba(7, 7, 12, 0.55) 100%),
    radial-gradient(ellipse 90% 55% at 50% 58%, transparent 35%, rgba(7, 7, 12, 0.45) 100%);
}
.fleet-folio__rail {
  position: absolute;
  left: clamp(0.6rem, 1.6vw, 1.2rem);
  top: 42%;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: left center;
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  color: rgba(232, 238, 245, 0.32);
  white-space: nowrap;
  z-index: 4;
  pointer-events: none;
}
.fleet-folio__num {
  position: absolute;
  right: clamp(1rem, 4vw, 3rem);
  top: 6vh;
  font-family: var(--font-display);
  font-size: clamp(5rem, 18vw, 12rem);
  line-height: 0.85;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(232, 238, 245, 0.07);
  z-index: 0;
  pointer-events: none;
  user-select: none;
}
.fleet-folio__wordmark {
  position: relative;
  z-index: 3;
  text-align: center;
  padding-top: clamp(4.8rem, 9vh, 6.5rem);
  pointer-events: none;
}
.fleet-folio__title {
  margin: 0;
  font-size: clamp(2.2rem, 6.5vw, 4.4rem);
  letter-spacing: -0.03em;
  line-height: 0.95;
  color: var(--ink);
  text-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}
.fleet-folio__outline {
  margin: 0.12em 0 0;
  font-size: clamp(2rem, 5.8vw, 3.8rem);
  letter-spacing: -0.03em;
  line-height: 0.95;
}
.fleet-folio__lede {
  position: relative;
  z-index: 3;
  text-align: center;
  max-width: 40ch;
  margin: 0.65rem auto 0;
  padding: 0 1.25rem;
  color: var(--ink-dim);
  font-size: 0.88rem;
  line-height: 1.5;
  pointer-events: none;
}

.fleet-shelf {
  --H: min(46vh, 31vw);
  position: relative;
  z-index: 2;
  width: 100%;
  min-height: calc(var(--H) + 240px);
  margin-top: 0.5rem;
  user-select: none;
}
.fleet-shelf__probe {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  height: var(--H);
  width: 1px;
}
.fleet-shelf__tabs {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
  width: max-content;
  margin: 1rem auto 0;
  border: 1px solid rgba(232, 238, 245, 0.16);
  background: rgba(7, 7, 12, 0.35);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 40px -24px rgba(0, 0, 0, 0.8);
}
.fleet-shelf__tab-ind {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: linear-gradient(180deg, #a8d6ff 0%, #8ec8ff 100%);
  transition: width 0.6s cubic-bezier(.2,.8,.2,1), transform 0.6s cubic-bezier(.2,.8,.2,1);
  z-index: 0;
  pointer-events: none;
}
.fleet-shelf__tab {
  position: relative;
  z-index: 1;
  height: 28px;
  padding: 0 14px;
  margin-left: -1px;
  border: 1px solid rgba(232, 238, 245, 0.14);
  background: transparent;
  color: rgba(232, 238, 245, 0.78);
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.45s cubic-bezier(.2,.8,.2,1);
}
.fleet-shelf__tab.is-on { color: #050508; }

.fleet-shelf__stage-wrap {
  position: relative;
  width: 100%;
  height: calc(var(--H) + 96px);
  margin-top: 1.35rem;
  perspective: 2400px;
  perspective-origin: 50% 48%;
  background: transparent;
}
.fleet-shelf__stage-wrap::before,
.fleet-shelf__stage-wrap::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 12%;
  width: clamp(2.5rem, 8vw, 6rem);
  z-index: 3;
  pointer-events: none;
}
.fleet-shelf__stage-wrap::before {
  left: 0;
  background: linear-gradient(90deg, var(--bg) 0%, transparent 100%);
}
.fleet-shelf__stage-wrap::after {
  right: 0;
  background: linear-gradient(270deg, var(--bg) 0%, transparent 100%);
}
.fleet-shelf__stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

.fleet-tape {
  position: absolute;
  left: 0; top: 0;
  width: 0; height: 0;
  transform-style: preserve-3d;
  will-change: transform;
  cursor: pointer;
}
.fleet-tape__sp,
.fleet-tape__cv {
  position: absolute;
  top: calc(var(--H) / -2);
  height: var(--H);
  border-radius: 3px;
  backface-visibility: hidden;
  overflow: hidden;
  background: #0a0b10;
}
.fleet-tape__sp {
  width: var(--ws);
  left: calc(var(--ws) / -2);
  transform: translateZ(calc(var(--d) / 2));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6% 8% 8%;
  box-sizing: border-box;
  border: 1px solid rgba(232, 238, 245, 0.08);
}
.fleet-tape__cv {
  width: var(--d);
  left: calc(var(--d) / -2);
  transform: rotateY(90deg) translateZ(calc(var(--ws) / 2));
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 60px -28px rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(232, 238, 245, 0.1);
}
.fleet-tape__shade {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: var(--shade-sp, 0);
  pointer-events: none;
}
.fleet-tape__shade--cv { opacity: var(--shade-cv, 0.45); }

.fleet-tape__sp-art {
  width: 78%;
  aspect-ratio: 1;
  border-radius: 2px;
  background: #12141c center / cover no-repeat;
  flex-shrink: 0;
  filter: saturate(0.85) brightness(0.85);
}
.fleet-tape__sp-title {
  flex: 1;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: var(--font-display);
  font-size: clamp(9px, calc(var(--H) * 0.045), 15px);
  letter-spacing: 0.04em;
  color: #e8eef5;
  margin: 10% 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-height: 55%;
}
.fleet-tape__sp-brand {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
  color: rgba(232, 238, 245, 0.55);
}
.fleet-tape__sp-badge {
  margin-top: 4px;
  padding: 2px 4px;
  border: 1px solid rgba(232, 238, 245, 0.35);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.1em;
  color: #8ec8ff;
}

/* Cover = dossier card (image 1): full-bleed photo + dark body */
.fleet-tape__cv-photo {
  position: relative;
  flex: 0 0 46%;
  width: 100%;
  background: #0a0b10 center / cover no-repeat;
  filter: saturate(0.92) brightness(0.88);
}
.fleet-tape__cv-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, transparent 40%, rgba(5, 5, 8, 0.75) 100%),
    radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(5, 5, 8, 0.35) 100%);
  pointer-events: none;
}
.fleet-tape__cv-credit {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 6px;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.78);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
.fleet-tape__cv-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.55rem 0.65rem 0.7rem;
  background: #07080c;
}
.fleet-tape__cv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  color: rgba(232, 238, 245, 0.45);
}
.fleet-tape__cv-body h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(11px, calc(var(--H) * 0.07), 18px);
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: #fff;
}
.fleet-tape__cv-body p {
  margin: 0;
  font-size: clamp(8px, calc(var(--H) * 0.038), 11px);
  line-height: 1.35;
  color: rgba(232, 238, 245, 0.55);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fleet-shelf__play {
  position: absolute;
  z-index: 6;
  top: calc(50% + var(--H) * 0.22);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid #8ec8ff;
  background: rgba(8, 10, 16, 0.75);
  color: #8ec8ff;
  cursor: pointer;
  transform: translate(-50%, -50%) scale(0);
  transition: none;
}
.fleet-shelf__play::after {
  content: "";
  position: absolute;
  left: 52%;
  top: 50%;
  transform: translate(-40%, -50%);
  border-style: solid;
  border-width: 7px 0 7px 12px;
  border-color: transparent transparent transparent currentColor;
}

.fleet-shelf__caption {
  position: relative;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.85rem;
  pointer-events: none;
  text-align: center;
}
.fleet-shelf__mask {
  position: relative;
  overflow: hidden;
  width: min(92vw, 760px);
  height: 1.15em;
}
.fleet-shelf__mask span {
  display: block;
  width: 100%;
}
/* Match hero / “One silent fleet.” outline title treatment */
.fleet-shelf__mask--title {
  height: 1.35em;
  font-family: var(--font-display);
  font-size: clamp(1.85rem, 4.8vw, 3.1rem);
  letter-spacing: -0.03em;
  line-height: 1.1;
  filter: drop-shadow(0 14px 36px rgba(0, 0, 0, 0.45));
}
.fleet-shelf__mask--title,
.fleet-shelf__mask--title span {
  color: transparent;
  -webkit-text-stroke: 1.25px rgba(232, 238, 245, 0.62);
}
.fleet-shelf__mask--sub {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  color: rgba(142, 200, 255, 0.88);
  text-transform: uppercase;
}
.fleet-shelf__mask--year {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: rgba(232, 238, 245, 0.48);
}

.fleet-shelf__arrow {
  position: absolute;
  z-index: 5;
  top: calc(50% + var(--H) * 0.52);
  width: 44px;
  height: 44px;
  border: 1px solid rgba(232, 238, 245, 0.14);
  border-radius: 50%;
  background: rgba(7, 7, 12, 0.35);
  backdrop-filter: blur(8px);
  color: #e8eef5;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.25s var(--ease), border-color 0.25s var(--ease), background 0.25s var(--ease);
}
.fleet-shelf__arrow:hover {
  opacity: 1;
  border-color: rgba(142, 200, 255, 0.35);
  background: rgba(12, 16, 28, 0.55);
}
.fleet-shelf__arrow svg { width: 18px; height: 10px; }
.fleet-shelf__arrow--l { left: 20px; }
.fleet-shelf__arrow--r { right: 20px; }

.fleet-shelf__hint {
  text-align: center;
  margin: 1.35rem auto 0;
  padding: 0 1rem;
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  color: rgba(232, 238, 245, 0.38);
  max-width: 48ch;
}

@media (max-width: 767px) {
  .fleet-shelf { --H: min(60vw, 40svh); }
  .fleet-folio__rail { display: none; }
  .fleet-folio__title { font-size: 10vw; }
  .fleet-folio__outline { font-size: 8.5vw; }
  .fleet-shelf__arrow--l { left: 6px; }
  .fleet-shelf__arrow--r { right: 6px; }
  .fleet-shelf__mask--title { font-size: clamp(1.45rem, 7.5vw, 2rem); }
  .fleet-shelf__tab { padding: 0 9px; font-size: 9px; height: 26px; }
  .fleet-shelf__stage-wrap::before,
  .fleet-shelf__stage-wrap::after { width: 1.5rem; }
}
`

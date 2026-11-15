/**
 * Narrative score — two NASA media beds crossfaded into one continuum.
 * Bed A: Van Allen Probes EMFISIS chorus (plasma whistlers)
 * Bed B: Cassini Saturn radio emissions (“Spooky Saturn”)
 * Film cues still own dive / storm / scored silence — not a static playlist.
 *
 * Sources & license: public/audio/ATTRIBUTION.txt (NASA Media Usage Guidelines)
 */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

const BED_URLS = {
  chorus: '/audio/bed-chorus.mp3',
  saturn: '/audio/bed-saturn.mp3',
}

export function createSoundscape() {
  let context = null
  let master = null
  let bedBus = null
  let bedFilter = null
  let chorusGain = null
  let saturnGain = null
  let stormGain = null
  let diveGain = null
  let tickGain = null
  let heartbeatGain = null
  let sub = null
  let subGain = null
  let stormNoise = null
  let stormFilter = null
  let diveNoise = null
  let diveFilter = null
  let heartbeat = null
  let pulseTimer = null
  let blendTimer = null
  let chorusSrc = null
  let saturnSrc = null
  let buffers = { chorus: null, saturn: null }
  let loadPromise = null
  let enabled = false
  let lastCue = ''
  let silenceUntil = 0
  let deathLatched = false
  let blendPhase = 0
  let targetChorus = 0.62
  let targetSaturn = 0.38
  let liveChorus = 0.62
  let liveSaturn = 0.38

  async function decodeBed(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`audio ${url} ${res.status}`)
    const raw = await res.arrayBuffer()
    return ctx.decodeAudioData(raw.slice(0))
  }

  async function loadBeds() {
    if (!ctx) return
    if (buffers.chorus && buffers.saturn) return
    if (loadPromise) return loadPromise
    loadPromise = Promise.all([
      decodeBed(BED_URLS.chorus),
      decodeBed(BED_URLS.saturn),
    ]).then(([chorus, saturn]) => {
      buffers.chorus = chorus
      buffers.saturn = saturn
    }).catch((err) => {
      console.warn('[soundscape] bed load failed', err)
      loadPromise = null
    })
    return loadPromise
  }

  function startLoop(buffer, dest, offset = 0) {
    if (!ctx || !buffer) return null
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    // Soft seam — loop with a tiny offset so the two beds never phase-lock
    src.loopStart = 0.05
    src.loopEnd = Math.max(0.2, buffer.duration - 0.08)
    src.connect(dest)
    try {
      src.start(0, offset % Math.max(0.1, buffer.duration - 0.1))
    } catch {
      src.start(0)
    }
    return src
  }

  function ensureGraph() {
    if (ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()

    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    bedBus = ctx.createGain()
    bedBus.gain.value = 1
    bedFilter = ctx.createBiquadFilter()
    bedFilter.type = 'lowpass'
    bedFilter.frequency.value = 2400
    bedFilter.Q.value = 0.55
    bedBus.connect(bedFilter)
    bedFilter.connect(master)

    chorusGain = ctx.createGain()
    chorusGain.gain.value = liveChorus
    chorusGain.connect(bedBus)

    saturnGain = ctx.createGain()
    saturnGain.gain.value = liveSaturn
    saturnGain.connect(bedBus)

    stormGain = ctx.createGain()
    stormGain.gain.value = 0
    stormGain.connect(master)

    diveGain = ctx.createGain()
    diveGain.gain.value = 0
    diveGain.connect(master)

    tickGain = ctx.createGain()
    tickGain.gain.value = 0.7
    tickGain.connect(master)

    heartbeatGain = ctx.createGain()
    heartbeatGain.gain.value = 0
    heartbeatGain.connect(master)

    // Quiet sub glue under the NASA beds — never the star
    sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 38
    subGain = ctx.createGain()
    subGain.gain.value = 0.012
    sub.connect(subGain)
    subGain.connect(bedFilter)

    // Event textures — filtered noise only for storm / dive accents
    const sbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const sd = sbuf.getChannelData(0)
    for (let i = 0; i < sd.length; i++) sd[i] = (Math.random() * 2 - 1) * 0.55
    stormNoise = ctx.createBufferSource()
    stormNoise.buffer = sbuf
    stormNoise.loop = true
    stormFilter = ctx.createBiquadFilter()
    stormFilter.type = 'bandpass'
    stormFilter.frequency.value = 320
    stormFilter.Q.value = 0.85
    const stormTrim = ctx.createGain()
    stormTrim.gain.value = 0.55
    stormNoise.connect(stormFilter)
    stormFilter.connect(stormTrim)
    stormTrim.connect(stormGain)

    const dbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const dd = dbuf.getChannelData(0)
    for (let i = 0; i < dd.length; i++) {
      dd[i] = (Math.random() * 2 - 1) * (0.25 + 0.55 * Math.sin(i / 48))
    }
    diveNoise = ctx.createBufferSource()
    diveNoise.buffer = dbuf
    diveNoise.loop = true
    diveFilter = ctx.createBiquadFilter()
    diveFilter.type = 'lowpass'
    diveFilter.frequency.value = 720
    diveFilter.Q.value = 0.45
    const diveTrim = ctx.createGain()
    diveTrim.gain.value = 0.45
    diveNoise.connect(diveFilter)
    diveFilter.connect(diveTrim)
    diveTrim.connect(diveGain)

    heartbeat = ctx.createOscillator()
    heartbeat.type = 'sine'
    heartbeat.frequency.value = 48
    const hPulse = ctx.createGain()
    hPulse.gain.value = 0.0001
    heartbeat.connect(hPulse)
    hPulse.connect(heartbeatGain)
    const schedulePulse = () => {
      if (!ctx || !hPulse) return
      const t = ctx.currentTime
      hPulse.gain.cancelScheduledValues(t)
      hPulse.gain.setValueAtTime(0.0001, t)
      hPulse.gain.exponentialRampToValueAtTime(0.028, t + 0.05)
      hPulse.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      hPulse.gain.setValueAtTime(0.0001, t + 0.55)
      hPulse.gain.exponentialRampToValueAtTime(0.018, t + 0.6)
      hPulse.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
    }
    schedulePulse()
    pulseTimer = setInterval(schedulePulse, 1100)

    sub.start()
    stormNoise.start()
    diveNoise.start()
    heartbeat.start()

    // Slow A↔B crossfade — never a hard cut between the two NASA beds
    blendTimer = setInterval(() => {
      if (!ctx || !chorusGain || !saturnGain) return
      blendPhase += 0.018
      const wave = 0.5 + 0.5 * Math.sin(blendPhase)
      const a = clamp(targetChorus * (0.72 + 0.28 * wave), 0.08, 0.95)
      const b = clamp(targetSaturn * (0.72 + 0.28 * (1 - wave)), 0.06, 0.9)
      // Normalize so the blend stays even
      const sum = a + b || 1
      liveChorus = (a / sum) * 0.92
      liveSaturn = (b / sum) * 0.92
      const now = ctx.currentTime
      chorusGain.gain.setTargetAtTime(enabled ? liveChorus : 0, now, 0.85)
      saturnGain.gain.setTargetAtTime(enabled ? liveSaturn : 0, now, 0.85)
    }, 120)
  }

  async function armBeds() {
    ensureGraph()
    if (!ctx) return false
    await loadBeds()
    if (!buffers.chorus || !buffers.saturn) return false
    if (!chorusSrc) chorusSrc = startLoop(buffers.chorus, chorusGain, 0)
    if (!saturnSrc) saturnSrc = startLoop(buffers.saturn, saturnGain, 4.2)
    return true
  }

  async function unlock() {
    ensureGraph()
    if (!ctx) return false
    if (ctx.state === 'suspended') await ctx.resume()
    await armBeds()
    return ctx.state === 'running'
  }

  function setEnabled(on) {
    enabled = !!on
    ensureGraph()
    if (!ctx || !master) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(enabled ? 0.78 : 0, now, 0.5)
    if (enabled) {
      unlock()
    } else if (chorusGain && saturnGain) {
      chorusGain.gain.setTargetAtTime(0, now, 0.35)
      saturnGain.gain.setTargetAtTime(0, now, 0.35)
    }
  }

  function toggle() {
    setEnabled(!enabled)
    return enabled
  }

  function isEnabled() { return enabled }

  function setFilm(sample) {
    if (!ctx || !bedFilter) return
    const now = ctx.currentTime
    if (now < silenceUntil) return

    const cue = sample?.cue || sample?.act?.id || 'arrive'
    const storm = sample?.event?.storm ?? sample?.fx?.storm ?? 0
    const carrier = sample?.event?.carrier ?? sample?.fx?.carrier ?? 0
    const dive = sample?.event?.dive ?? sample?.fx?.dive ?? 0
    const dark = sample?.dark ?? 0
    const focus = sample?.focus || ''

    // Bed mix follows the film — chorus for lunar/void, Saturn radio for Mars/transit
    if (focus === 'mars' || focus === 'storm' || cue === 'opportunity_death' || cue === 'mars') {
      targetChorus = 0.34
      targetSaturn = 0.78
    } else if (focus === 'transit' || cue === 'journey') {
      targetChorus = 0.48
      targetSaturn = 0.62
    } else if (focus === 'pioneer' || cue === 'carrier' || cue === 'carrier_lost' || cue === 'silence') {
      targetChorus = 0.72
      targetSaturn = 0.28
    } else {
      targetChorus = 0.66
      targetSaturn = 0.34
    }

    bedFilter.frequency.setTargetAtTime(
      1600 + dive * 900 - storm * 500 - dark * 380 + (1 - carrier) * 220,
      now,
      0.45,
    )
    if (sub) sub.frequency.setTargetAtTime(34 + carrier * 6 - dark * 4 + storm * 3, now, 0.5)
    if (subGain) {
      subGain.gain.setTargetAtTime(
        enabled ? 0.01 * (1 - storm * 0.55) * (1 - dark * 0.35) : 0,
        now,
        0.4,
      )
    }

    // Bed thins when scored silence / storm owns the room
    const bedMul = (1 - carrier * 0.72) * (1 - storm * 0.38) * (1 - dark * 0.28)
    if (bedBus) bedBus.gain.setTargetAtTime(enabled ? bedMul : 0, now, 0.4)

    stormGain.gain.setTargetAtTime(enabled ? storm * 0.14 : 0, now, 0.3)
    if (stormFilter) stormFilter.frequency.setTargetAtTime(220 + storm * 480, now, 0.3)

    diveGain.gain.setTargetAtTime(enabled ? dive * 0.11 : 0, now, 0.24)
    if (diveFilter) diveFilter.frequency.setTargetAtTime(520 + dive * 700, now, 0.25)

    if (cue === 'opportunity_death' || storm > 0.55) {
      heartbeatGain.gain.setTargetAtTime(enabled ? 0.016 * (1 - storm * 0.3) : 0, now, 0.5)
    } else {
      heartbeatGain.gain.setTargetAtTime(0, now, 0.4)
    }

    if (cue !== 'opportunity_death' && (sample?.event?.storm ?? 0) < 0.2) {
      deathLatched = false
    }

    if (cue !== lastCue) {
      if (cue === 'dive') rushDive()
      if (cue === 'opportunity_death' && !deathLatched) {
        deathLatched = true
        scoreOpportunityDeath()
      }
      if (cue === 'mars') ping(500, 0.028, 0.45)
      if (cue === 'journey') {
        rushDive()
        ping(280, 0.035, 1.4)
      }
      if (cue === 'carrier') ping(210, 0.035, 0.8)
      if (cue === 'carrier_lost') scoreCarrierLost()
      if (cue === 'near') ping(640, 0.022, 0.35)
      lastCue = cue
    }

  function setProgress(p) {
    const storm = clamp((p - 0.5) / 0.14, 0, 1) * (1 - clamp((p - 0.66) / 0.06, 0, 1))
    const carrier = clamp((p - 0.68) / 0.22, 0, 1)
    const dive = clamp((p - 0.22) / 0.12, 0, 1) * (1 - clamp((p - 0.34) / 0.05, 0, 1))
    let cue = 'arrive'
    let focus = 'moon'
    if (p > 0.84) { cue = 'carrier_lost'; focus = 'pioneer' }
    else if (p > 0.66) { cue = 'carrier'; focus = 'pioneer' }
    else if (p > 0.5) { cue = 'opportunity_death'; focus = 'storm' }
    else if (p > 0.36) { cue = 'mars'; focus = 'mars' }
    else if (p > 0.22) { cue = 'dive'; focus = 'dive' }
    else if (p > 0.1) { cue = 'near'; focus = 'moon' }
    setFilm({ cue, focus, event: { storm, carrier, dive }, dark: storm * 0.9 + carrier * 0.4 })
  }

  function rushDive() {
    if (!enabled || !ctx || !diveGain) return
    const now = ctx.currentTime
    diveGain.gain.cancelScheduledValues(now)
    diveGain.gain.setValueAtTime(Math.max(diveGain.gain.value, 0.03), now)
    diveGain.gain.linearRampToValueAtTime(0.16, now + 0.55)
    ping(140, 0.05, 1.1)
  }

  function scoreOpportunityDeath() {
    if (!enabled || !ctx || !master || !stormGain) return
    const now = ctx.currentTime
    stormGain.gain.cancelScheduledValues(now)
    stormGain.gain.setValueAtTime(Math.max(stormGain.gain.value, 0.06), now)
    stormGain.gain.linearRampToValueAtTime(0.22, now + 1.55)
    stormGain.gain.linearRampToValueAtTime(0.03, now + 2.4)
    if (heartbeatGain) {
      heartbeatGain.gain.cancelScheduledValues(now)
      heartbeatGain.gain.setValueAtTime(0.018, now)
      heartbeatGain.gain.linearRampToValueAtTime(0.032, now + 1.1)
      heartbeatGain.gain.linearRampToValueAtTime(0.0001, now + 2.1)
    }
    silenceUntil = now + 4.2
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.7), now)
    master.gain.linearRampToValueAtTime(0.85, now + 1.15)
    master.gain.linearRampToValueAtTime(0.01, now + 2.15)
    master.gain.setTargetAtTime(0.014, now + 2.4, 0.4)
    master.gain.setTargetAtTime(0.42, now + 4.2, 1.1)
    ping(72, 0.04, 1.8)
    setTimeout(() => {
      if (!enabled || !ctx) return
      ping(48, 0.012, 2.4)
    }, 2100)
  }

  function scoreCarrierLost() {
    if (!enabled || !ctx || !master) return
    const now = ctx.currentTime
    silenceUntil = now + 1.8
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(0.02, now, 0.06)
    master.gain.setTargetAtTime(0.5, now + 1.8, 0.9)
    ping(88, 0.035, 1.4)
    setTimeout(() => {
      if (!enabled || !ctx) return
      ping(55, 0.016, 2.2)
    }, 400)
  }

    const now = audioContext.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(0.02, now, 0.08)
    master.gain.setTargetAtTime(0.72, now + ms / 1000, 0.5)
    ping(90, 0.04, 1.2)
  }

  function ping(freq = 620, amp = 0.035, dur = 0.55) {
    if (!enabled || !ctx || !tickGain) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.value = 0.0001
    o.connect(g)
    g.connect(tickGain)
    const now = ctx.currentTime
    g.gain.exponentialRampToValueAtTime(amp, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), now + dur)
    o.start(now)
    o.stop(now + dur + 0.05)
  }

  function dispose() {
    try {
      if (pulseTimer) clearInterval(pulseTimer)
      if (blendTimer) clearInterval(blendTimer)
      chorusSrc?.stop()
      saturnSrc?.stop()
      stormNoise?.stop()
      diveNoise?.stop()
      heartbeat?.stop()
      sub?.stop()
      ctx?.close()
    } catch { /* ignore */ }
    pulseTimer = null
    blendTimer = null
    chorusSrc = null
    saturnSrc = null
    ctx = null
  }

  return { setEnabled, dispose }
}

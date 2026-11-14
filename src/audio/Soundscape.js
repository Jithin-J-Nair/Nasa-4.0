/**
 * Narrative score — not a bed with cues.
 * Dive rush · storm smother · scored silence when the carrier dies.
 */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

export function createSoundscape() {
  let ctx = null
  let master = null
  let bedGain = null
  let stormGain = null
  let carrierGain = null
  let diveGain = null
  let tickGain = null
  let filter = null
  let drone = null
  let drone2 = null
  let sub = null
  let noise = null
  let stormNoise = null
  let stormFilter = null
  let diveNoise = null
  let diveFilter = null
  let enabled = false
  let lastCue = ''
  let silenceUntil = 0
  let heartbeat = null
  let heartbeatGain = null
  let pulseTimer = null

  function ensure() {
    if (ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()

    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    bedGain = ctx.createGain()
    bedGain.gain.value = 1
    bedGain.connect(master)

    stormGain = ctx.createGain()
    stormGain.gain.value = 0
    stormGain.connect(master)

    diveGain = ctx.createGain()
    diveGain.gain.value = 0
    diveGain.connect(master)

    carrierGain = ctx.createGain()
    carrierGain.gain.value = 0.35
    carrierGain.connect(master)

    tickGain = ctx.createGain()
    tickGain.gain.value = 0.75
    tickGain.connect(master)

    heartbeatGain = ctx.createGain()
    heartbeatGain.gain.value = 0
    heartbeatGain.connect(master)

    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.7
    filter.connect(bedGain)

    drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 52
    const g1 = ctx.createGain()
    g1.gain.value = 0.038
    drone.connect(g1)
    g1.connect(filter)

    drone2 = ctx.createOscillator()
    drone2.type = 'triangle'
    drone2.frequency.value = 78
    const g2 = ctx.createGain()
    g2.gain.value = 0.012
    drone2.connect(g2)
    g2.connect(filter)

    sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 34
    const g3 = ctx.createGain()
    g3.gain.value = 0.028
    sub.connect(g3)
    g3.connect(filter)

    // Space hiss / carrier bed
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35
    noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const nF = ctx.createBiquadFilter()
    nF.type = 'bandpass'
    nF.frequency.value = 880
    nF.Q.value = 0.4
    const nG = ctx.createGain()
    nG.gain.value = 0.012
    noise.connect(nF)
    nF.connect(nG)
    nG.connect(carrierGain)

    // Storm — harsh dust
    const sbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const sd = sbuf.getChannelData(0)
    for (let i = 0; i < sd.length; i++) sd[i] = (Math.random() * 2 - 1)
    stormNoise = ctx.createBufferSource()
    stormNoise.buffer = sbuf
    stormNoise.loop = true
    stormFilter = ctx.createBiquadFilter()
    stormFilter.type = 'bandpass'
    stormFilter.frequency.value = 380
    stormFilter.Q.value = 0.9
    stormNoise.connect(stormFilter)
    stormFilter.connect(stormGain)

    // Dive — rushing regolith
    const dbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const dd = dbuf.getChannelData(0)
    for (let i = 0; i < dd.length; i++) {
      dd[i] = (Math.random() * 2 - 1) * (0.3 + 0.7 * Math.sin(i / 40))
    }
    diveNoise = ctx.createBufferSource()
    diveNoise.buffer = dbuf
    diveNoise.loop = true
    diveFilter = ctx.createBiquadFilter()
    diveFilter.type = 'lowpass'
    diveFilter.frequency.value = 900
    diveFilter.Q.value = 0.5
    diveNoise.connect(diveFilter)
    diveFilter.connect(diveGain)

    // Soft heartbeat for Opportunity death
    heartbeat = ctx.createOscillator()
    heartbeat.type = 'sine'
    heartbeat.frequency.value = 48
    const hPulse = ctx.createGain()
    hPulse.gain.value = 0.0001
    heartbeat.connect(hPulse)
    hPulse.connect(heartbeatGain)
    // Schedule a slow pulse envelope loop via LFO-ish gain automation
    const schedulePulse = () => {
      if (!ctx || !hPulse) return
      const t = ctx.currentTime
      hPulse.gain.cancelScheduledValues(t)
      hPulse.gain.setValueAtTime(0.0001, t)
      hPulse.gain.exponentialRampToValueAtTime(0.03, t + 0.05)
      hPulse.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      hPulse.gain.setValueAtTime(0.0001, t + 0.55)
      hPulse.gain.exponentialRampToValueAtTime(0.02, t + 0.6)
      hPulse.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
    }
    schedulePulse()
    pulseTimer = setInterval(schedulePulse, 1100)

    drone.start()
    drone2.start()
    sub.start()
    noise.start()
    stormNoise.start()
    diveNoise.start()
    heartbeat.start()
  }

  async function unlock() {
    ensure()
    if (!ctx) return false
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx.state === 'running'
  }

  function setEnabled(on) {
    enabled = !!on
    ensure()
    if (!ctx || !master) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(enabled ? 0.92 : 0, now, 0.45)
    if (enabled) unlock()
  }

  function toggle() {
    setEnabled(!enabled)
    return enabled
  }

  function isEnabled() { return enabled }

  function setFilm(sample) {
    if (!ctx || !filter || !drone) return
    const now = ctx.currentTime
    if (now < silenceUntil) return

    const cue = sample?.cue || sample?.act?.id || 'arrive'
    const storm = sample?.event?.storm ?? sample?.fx?.storm ?? 0
    const carrier = sample?.event?.carrier ?? sample?.fx?.carrier ?? 0
    const dive = sample?.event?.dive ?? sample?.fx?.dive ?? 0
    const dark = sample?.dark ?? 0

    filter.frequency.setTargetAtTime(
      320 + dive * 520 - storm * 160 - dark * 80 + (1 - carrier) * 40,
      now,
      0.4,
    )
    drone.frequency.setTargetAtTime(46 + storm * 8 + (cue === 'silence' || cue === 'carrier_lost' ? 6 : 0), now, 0.55)
    drone2.frequency.setTargetAtTime(72 + dive * 55 + storm * 28, now, 0.45)
    sub.frequency.setTargetAtTime(30 + carrier * 8 - dark * 4, now, 0.5)

    stormGain.gain.setTargetAtTime(enabled ? storm * 0.26 : 0, now, 0.28)
    if (stormFilter) stormFilter.frequency.setTargetAtTime(240 + storm * 620, now, 0.3)

    diveGain.gain.setTargetAtTime(enabled ? dive * 0.2 : 0, now, 0.22)
    if (diveFilter) diveFilter.frequency.setTargetAtTime(600 + dive * 900, now, 0.25)

    // Bed thins as darkness / carrier owns the room
    const bedMul = (1 - carrier * 0.85) * (1 - storm * 0.45) * (1 - dark * 0.35)
    bedGain.gain.setTargetAtTime(enabled ? bedMul : 0, now, 0.35)
    carrierGain.gain.setTargetAtTime(enabled ? (0.28 + carrier * 0.12) * (1 - storm * 0.9) * (1 - dark * 0.4) : 0, now, 0.4)

    // Opportunity death — heartbeat under the smother, then cut
    if (cue === 'opportunity_death' || storm > 0.55) {
      heartbeatGain.gain.setTargetAtTime(enabled ? 0.018 * (1 - storm * 0.3) : 0, now, 0.5)
    } else {
      heartbeatGain.gain.setTargetAtTime(0, now, 0.4)
    }

    if (cue !== lastCue) {
      if (cue === 'dive') rushDive()
      if (cue === 'opportunity_death') scoreOpportunityDeath()
      if (cue === 'mars') ping(500, 0.03, 0.45)
      if (cue === 'carrier') ping(210, 0.04, 0.8)
      if (cue === 'carrier_lost') scoreCarrierLost()
      if (cue === 'near') ping(640, 0.025, 0.35)
      lastCue = cue
    }
  }

  function setProgress(p) {
    const storm = clamp((p - 0.5) / 0.14, 0, 1) * (1 - clamp((p - 0.66) / 0.06, 0, 1))
    const carrier = clamp((p - 0.68) / 0.22, 0, 1)
    const dive = clamp((p - 0.22) / 0.12, 0, 1) * (1 - clamp((p - 0.34) / 0.05, 0, 1))
    let cue = 'arrive'
    if (p > 0.84) cue = 'carrier_lost'
    else if (p > 0.66) cue = 'carrier'
    else if (p > 0.5) cue = 'opportunity_death'
    else if (p > 0.36) cue = 'mars'
    else if (p > 0.22) cue = 'dive'
    else if (p > 0.1) cue = 'near'
    setFilm({ cue, event: { storm, carrier, dive }, dark: storm * 0.9 + carrier * 0.4 })
  }

  function rushDive() {
    if (!enabled || !ctx || !diveGain) return
    const now = ctx.currentTime
    diveGain.gain.cancelScheduledValues(now)
    diveGain.gain.setValueAtTime(Math.max(diveGain.gain.value, 0.04), now)
    diveGain.gain.linearRampToValueAtTime(0.24, now + 0.55)
    ping(140, 0.06, 1.1)
  }

  /** Room goes dark — storm swell then scored silence */
  function scoreOpportunityDeath() {
    if (!enabled || !ctx || !master || !stormGain) return
    const now = ctx.currentTime
    stormGain.gain.cancelScheduledValues(now)
    stormGain.gain.setValueAtTime(Math.max(stormGain.gain.value, 0.08), now)
    stormGain.gain.linearRampToValueAtTime(0.32, now + 1.4)
    // Heartbeat then cut to near-silence
    silenceUntil = now + 2.6
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value || 0.9, now)
    master.gain.linearRampToValueAtTime(0.95, now + 1.2)
    master.gain.linearRampToValueAtTime(0.015, now + 1.85)
    master.gain.setTargetAtTime(0.7, now + 2.6, 0.7)
    ping(72, 0.045, 1.6)
  }

  /** Carrier death — signal collapses */
  function scoreCarrierLost() {
    if (!enabled || !ctx || !master) return
    const now = ctx.currentTime
    silenceUntil = now + 1.8
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(0.02, now, 0.06)
    master.gain.setTargetAtTime(0.55, now + 1.8, 0.9)
    ping(88, 0.04, 1.4)
    // Final faint ping that never returns
    setTimeout(() => {
      if (!enabled || !ctx) return
      ping(55, 0.02, 2.2)
    }, 400)
  }

  function signalDropout(ms = 900) {
    if (!enabled || !ctx || !master) return
    const now = ctx.currentTime
    silenceUntil = now + ms / 1000
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(0.02, now, 0.08)
    master.gain.setTargetAtTime(0.85, now + ms / 1000, 0.5)
    ping(90, 0.05, 1.2)
  }

  function ping(freq = 620, amp = 0.04, dur = 0.55) {
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
      drone?.stop(); drone2?.stop(); sub?.stop()
      noise?.stop(); stormNoise?.stop(); diveNoise?.stop()
      heartbeat?.stop()
      ctx?.close()
    } catch { /* ignore */ }
    pulseTimer = null
    ctx = null
  }

  return {
    unlock, setEnabled, toggle, isEnabled,
    setProgress, setFilm, ping, signalDropout, dispose,
  }
}

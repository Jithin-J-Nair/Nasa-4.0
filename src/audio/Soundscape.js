/**
 * Narrative soundscape — beds + storm swell + carrier dropout + UI ticks.
 * Designed as emotion, not a checkbox drone.
 */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

export function createSoundscape() {
  let ctx = null
  let master = null
  let bedGain = null
  let stormGain = null
  let carrierGain = null
  let tickGain = null
  let filter = null
  let drone = null
  let drone2 = null
  let sub = null
  let noise = null
  let stormNoise = null
  let stormFilter = null
  let enabled = false
  let lastAct = ''
  let dropoutUntil = 0

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

    carrierGain = ctx.createGain()
    carrierGain.gain.value = 0.4
    carrierGain.connect(master)

    tickGain = ctx.createGain()
    tickGain.gain.value = 0.7
    tickGain.connect(master)

    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 480
    filter.Q.value = 0.65
    filter.connect(bedGain)

    drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 54
    const g1 = ctx.createGain()
    g1.gain.value = 0.04
    drone.connect(g1)
    g1.connect(filter)

    drone2 = ctx.createOscillator()
    drone2.type = 'triangle'
    drone2.frequency.value = 81
    const g2 = ctx.createGain()
    g2.gain.value = 0.014
    drone2.connect(g2)
    g2.connect(filter)

    sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 36
    const g3 = ctx.createGain()
    g3.gain.value = 0.025
    sub.connect(g3)
    g3.connect(filter)

    // Soft space hiss
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4
    noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const nF = ctx.createBiquadFilter()
    nF.type = 'bandpass'
    nF.frequency.value = 900
    nF.Q.value = 0.35
    const nG = ctx.createGain()
    nG.gain.value = 0.01
    noise.connect(nF)
    nF.connect(nG)
    nG.connect(carrierGain)

    // Storm dust — harsher noise through bandpass
    const sbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const sd = sbuf.getChannelData(0)
    for (let i = 0; i < sd.length; i++) sd[i] = (Math.random() * 2 - 1)
    stormNoise = ctx.createBufferSource()
    stormNoise.buffer = sbuf
    stormNoise.loop = true
    stormFilter = ctx.createBiquadFilter()
    stormFilter.type = 'bandpass'
    stormFilter.frequency.value = 420
    stormFilter.Q.value = 0.8
    stormNoise.connect(stormFilter)
    stormFilter.connect(stormGain)

    drone.start()
    drone2.start()
    sub.start()
    noise.start()
    stormNoise.start()
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
    master.gain.setTargetAtTime(enabled ? 0.9 : 0, now, 0.4)
    if (enabled) unlock()
  }

  function toggle() {
    setEnabled(!enabled)
    return enabled
  }

  function isEnabled() { return enabled }

  /** Drive from FilmDirector sample */
  function setFilm(sample) {
    if (!ctx || !filter || !drone) return
    const now = ctx.currentTime
    if (now < dropoutUntil) return // respect silence punctuation

    const act = sample?.act?.id || 'hero'
    const storm = sample?.fx?.storm ?? 0
    const carrier = sample?.fx?.carrier ?? 0
    const dive = sample?.fx?.dive ?? 0

    const moon = act === 'hero' || act === 'intimacy' || act === 'crater_dive'
    const mars = act === 'mars' || act === 'dust_storm'

    filter.frequency.setTargetAtTime(
      360 + (moon ? 90 : 0) + (mars ? 200 : 0) + dive * 400 - storm * 120,
      now,
      0.45,
    )
    drone.frequency.setTargetAtTime(48 + (mars ? 10 : 0) + (act === 'silence' ? 8 : 0), now, 0.5)
    drone2.frequency.setTargetAtTime(76 + storm * 30 + dive * 40, now, 0.5)
    sub.frequency.setTargetAtTime(32 + carrier * 6, now, 0.5)

    stormGain.gain.setTargetAtTime(enabled ? storm * 0.22 : 0, now, 0.3)
    if (stormFilter) stormFilter.frequency.setTargetAtTime(280 + storm * 500, now, 0.35)

    // Carrier dying = bed thins
    bedGain.gain.setTargetAtTime(enabled ? (1 - carrier * 0.75) * (1 - storm * 0.35) : 0, now, 0.4)
    carrierGain.gain.setTargetAtTime(enabled ? (0.35 + carrier * 0.15) * (1 - storm * 0.8) : 0, now, 0.4)

    if (act !== lastAct) {
      if (act === 'dust_storm') swellStorm()
      if (act === 'crater_dive') ping(180, 0.08, 0.9)
      if (act === 'carrier' || act === 'silence') signalDropout()
      if (act === 'mars') ping(520, 0.035, 0.4)
      lastAct = act
    }
  }

  function setProgress(p) {
    // legacy — map rough acts if film sample unavailable
    const storm = clamp((p - 0.55) / 0.15, 0, 1) * (1 - clamp((p - 0.7) / 0.08, 0, 1))
    const carrier = clamp((p - 0.72) / 0.2, 0, 1)
    const dive = clamp((p - 0.26) / 0.12, 0, 1) * (1 - clamp((p - 0.38) / 0.06, 0, 1))
    let id = 'hero'
    if (p > 0.86) id = 'silence'
    else if (p > 0.7) id = 'carrier'
    else if (p > 0.55) id = 'dust_storm'
    else if (p > 0.4) id = 'mars'
    else if (p > 0.26) id = 'crater_dive'
    else if (p > 0.12) id = 'intimacy'
    setFilm({ act: { id }, fx: { storm, carrier, dive } })
  }

  function swellStorm() {
    if (!enabled || !ctx || !stormGain) return
    const now = ctx.currentTime
    stormGain.gain.cancelScheduledValues(now)
    stormGain.gain.setValueAtTime(Math.max(stormGain.gain.value, 0.05), now)
    stormGain.gain.linearRampToValueAtTime(0.28, now + 1.2)
  }

  /** Opportunity / Pioneer — silence as punctuation */
  function signalDropout(ms = 900) {
    if (!enabled || !ctx || !master) return
    const now = ctx.currentTime
    dropoutUntil = now + ms / 1000
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
      drone?.stop(); drone2?.stop(); sub?.stop()
      noise?.stop(); stormNoise?.stop()
      ctx?.close()
    } catch { /* ignore */ }
    ctx = null
  }

  return {
    unlock, setEnabled, toggle, isEnabled,
    setProgress, setFilm, ping, signalDropout, dispose,
  }
}

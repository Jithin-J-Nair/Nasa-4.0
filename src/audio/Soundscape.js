/**
 * Silent Fleet soundscape — procedural Web Audio bed.
 * Acts shift drone + filter as scroll moves Moon → Mars → Deep space.
 * Starts muted until user gesture (browser policy).
 */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

export function createSoundscape() {
  let ctx = null
  let master = null
  let filter = null
  let drone = null
  let drone2 = null
  let noise = null
  let noiseGain = null
  let lfo = null
  let lfoGain = null
  let enabled = false
  let started = false
  let act = 0

  function ensure() {
    if (ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.7
    filter.connect(master)

    // Dual detuned sine drone
    drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 55
    const g1 = ctx.createGain()
    g1.gain.value = 0.045
    drone.connect(g1)
    g1.connect(filter)

    drone2 = ctx.createOscillator()
    drone2.type = 'triangle'
    drone2.frequency.value = 82.5
    const g2 = ctx.createGain()
    g2.gain.value = 0.018
    drone2.connect(g2)
    g2.connect(filter)

    // Soft noise bed (space hiss)
    const bufLen = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.35
    noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const nFilter = ctx.createBiquadFilter()
    nFilter.type = 'bandpass'
    nFilter.frequency.value = 900
    nFilter.Q.value = 0.4
    noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.012
    noise.connect(nFilter)
    nFilter.connect(noiseGain)
    noiseGain.connect(master)

    // Slow amplitude breath
    lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.07
    lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.012
    lfo.connect(lfoGain)
    lfoGain.connect(master.gain)

    drone.start()
    drone2.start()
    noise.start()
    lfo.start()
    started = true
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
    master.gain.setTargetAtTime(enabled ? 0.85 : 0, now, 0.35)
    if (lfoGain) lfoGain.gain.setTargetAtTime(enabled ? 0.012 : 0, now, 0.3)
    if (enabled) unlock()
  }

  function toggle() {
    setEnabled(!enabled)
    return enabled
  }

  function isEnabled() { return enabled }

  /** Map scroll progress 0–1 → sonic act */
  function setProgress(p) {
    if (!ctx || !filter || !drone) return
    const now = ctx.currentTime
    // Moon (cold) → Mars (warmer) → Deep (thinner)
    const moon = 1 - clamp((p - 0.05) / 0.35, 0, 1)
    const mars = clamp((p - 0.3) / 0.25, 0, 1) * (1 - clamp((p - 0.6) / 0.2, 0, 1))
    const deep = clamp((p - 0.65) / 0.25, 0, 1)

    const freq = 380 + moon * 80 + mars * 220 + deep * 40
    const q = 0.55 + mars * 0.35
    filter.frequency.setTargetAtTime(freq, now, 0.5)
    filter.Q.setTargetAtTime(q, now, 0.5)

    drone.frequency.setTargetAtTime(52 + deep * 18 + mars * 8, now, 0.6)
    drone2.frequency.setTargetAtTime(78 + mars * 24 + deep * 12, now, 0.6)
    if (noiseGain) noiseGain.gain.setTargetAtTime(0.008 + deep * 0.02 + mars * 0.006, now, 0.5)

    const nextAct = deep > 0.5 ? 2 : mars > 0.4 ? 1 : 0
    if (nextAct !== act) {
      act = nextAct
      ping()
    }
  }

  /** Soft UI ping — dossier open / act change */
  function ping(freq = 620) {
    if (!enabled || !ctx || !master) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.value = 0.0001
    o.connect(g)
    g.connect(master)
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.04, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, now + 0.5)
    o.start(now)
    o.stop(now + 0.6)
  }

  function dispose() {
    try {
      drone?.stop()
      drone2?.stop()
      noise?.stop()
      lfo?.stop()
      ctx?.close()
    } catch { /* ignore */ }
    ctx = null
    started = false
  }

  return { unlock, setEnabled, toggle, isEnabled, setProgress, ping, dispose, get started() { return started } }
}

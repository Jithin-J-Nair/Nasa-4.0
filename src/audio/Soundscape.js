const NASA_TRACKS = [
  { src: '/audio/nasa-emfisis-chorus.mp3', gain: 0.34 },
  { src: '/audio/nasa-cassini-saturn-radio-2.mp3', gain: 0.2 },
]

export function createSoundscape() {
  let context = null
  let master = null
  let buffers = null
  let loading = null
  let abortController = null
  let sources = []
  let stopTimer = null
  let enabled = false
  let disposed = false

  function getContext() {
    if (context) return context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null

    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = 0
    master.connect(context.destination)
    return context
  }

  function loadTracks(audioContext) {
    if (buffers) return Promise.resolve(buffers)
    if (loading) return loading

    const controller = new AbortController()
    abortController = controller
    loading = Promise.all(NASA_TRACKS.map(async (track) => {
      const response = await fetch(track.src, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`NASA audio request failed (${response.status}): ${track.src}`)
      }
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer())
      return { buffer, gain: track.gain }
    })).then((tracks) => {
      if (disposed) throw new Error('Soundscape was disposed while loading.')
      buffers = tracks
      return buffers
    }).finally(() => {
      loading = null
      if (abortController === controller) abortController = null
    })

    return loading
  }

  function stopSources() {
    stopTimer = null
    sources.forEach(({ source, gain }) => {
      try {
        source.stop()
      } catch {
        // A source already stopped by the browser needs no further cleanup.
      }
      source.disconnect()
      gain.disconnect()
    })
    sources = []
  }

  async function setEnabled(on) {
    enabled = Boolean(on)
    if (!enabled) {
      if (!context || !master) return false
      if (stopTimer) clearTimeout(stopTimer)
      const now = context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setTargetAtTime(0, now, 0.12)
      stopTimer = setTimeout(stopSources, 600)
      return false
    }

    if (disposed) throw new Error('Soundscape has been disposed.')
    const audioContext = getContext()
    if (!audioContext) return false

    // Resume synchronously from the user's click before awaiting network loading.
    const resumed = audioContext.state === 'suspended'
      ? audioContext.resume()
      : Promise.resolve()
    let tracks
    try {
      const results = await Promise.all([loadTracks(audioContext), resumed])
      tracks = results[0]
    } catch (error) {
      enabled = false
      abortController?.abort()
      const now = audioContext.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(0, now)
      if (audioContext.state === 'running') {
        await audioContext.suspend().catch((suspendError) => {
          console.error('Unable to suspend the ambient audio context:', suspendError)
        })
      }
      throw error
    }
    if (!enabled || disposed || audioContext.state !== 'running') return false

    if (stopTimer) clearTimeout(stopTimer)
    stopTimer = null
    if (sources.length === 0) {
      sources = tracks.map(({ buffer, gain: level }) => {
        const source = audioContext.createBufferSource()
        const gain = audioContext.createGain()
        source.buffer = buffer
        source.loop = true
        gain.gain.value = level
        source.connect(gain)
        gain.connect(master)
        source.start()
        return { source, gain }
      })
    }

    const now = audioContext.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(0.72, now, 0.55)
    return true
  }

  function dispose() {
    if (disposed) return
    disposed = true
    enabled = false
    if (stopTimer) clearTimeout(stopTimer)
    stopTimer = null
    abortController?.abort()
    stopSources()

    const audioContext = context
    context = null
    master = null
    buffers = null
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close().catch((error) => {
        console.error('Unable to close the ambient audio context:', error)
      })
    }
  }

  return { setEnabled, dispose }
}

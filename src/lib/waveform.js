// Client-side waveform peak extraction. Supabase/Stripe never generate
// waveform data server-side, so we decode the preview audio in the
// browser once per track and cache the peaks in memory for the session.

const cache = new Map() // url -> Promise<number[]>

export function getWaveformPeaks(url, samples = 80) {
  if (!url) return Promise.resolve(new Array(samples).fill(0.1))
  if (cache.has(url)) return cache.get(url)

  const promise = (async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      const res = await fetch(url)
      const arrayBuffer = await res.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      const raw = audioBuffer.getChannelData(0)
      const blockSize = Math.floor(raw.length / samples)
      const peaks = []
      for (let i = 0; i < samples; i++) {
        const start = i * blockSize
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(raw[start + j] || 0)
        }
        peaks.push(sum / blockSize)
      }
      const max = Math.max(...peaks, 0.001)
      ctx.close?.()
      return peaks.map((p) => Math.max(0.08, p / max))
    } catch {
      // Decoding can fail (CORS, unsupported format, etc.) — fall back to a
      // flat placeholder so the UI still renders something clickable.
      return new Array(samples).fill(0.35)
    }
  })()

  cache.set(url, promise)
  return promise
}

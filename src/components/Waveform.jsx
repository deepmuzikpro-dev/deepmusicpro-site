import { useEffect, useRef, useState } from 'react'
import { getWaveformPeaks } from '../lib/waveform'

/**
 * Renders a beat's waveform as bars. Bars up to `progress/duration` are
 * filled green (played), the rest are dim. Clicking/dragging seeks.
 */
export default function Waveform({ url, progress = 0, duration = 0, onSeek, height = 40, bars = 64 }) {
  const [peaks, setPeaks] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setPeaks(null)
    getWaveformPeaks(url, bars).then((p) => {
      if (!cancelled) setPeaks(p)
    })
    return () => { cancelled = true }
  }, [url, bars])

  function handleClick(e) {
    if (!onSeek || !duration || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeek(fraction * duration)
  }

  const playedFraction = duration > 0 ? Math.min(1, progress / duration) : 0
  const displayPeaks = peaks || new Array(bars).fill(0.15)

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="flex items-center gap-[2px] w-full cursor-pointer select-none"
      style={{ height }}
      title="Click to seek"
    >
      {displayPeaks.map((p, i) => {
        const played = i / bars < playedFraction
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-colors"
            style={{
              height: `${Math.max(10, p * 100)}%`,
              background: played ? '#1db954' : 'rgba(255,255,255,0.18)',
              opacity: peaks ? 1 : 0.5,
            }}
          />
        )
      })}
    </div>
  )
}

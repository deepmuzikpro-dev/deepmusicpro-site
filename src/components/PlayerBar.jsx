import { usePlayer } from '../context/PlayerContext.jsx'
import { useNavigate } from 'react-router-dom'
import Waveform from './Waveform.jsx'

function fmt(t) {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function PlayerBar() {
  const { current, isPlaying, progress, duration, toggle, next, prev, seek, volume, setVolume } = usePlayer()
  const navigate = useNavigate()

  if (!current) return null

  // Clicking anywhere on the bar opens the track's full details (waveform,
  // likes, license options, comments) — except the actual controls
  // (buttons, the waveform seek strip, the volume slider), which keep
  // their own click behavior.
  function handleBarClick(e) {
    if (e.target.closest('button, input, [data-waveform]')) return
    navigate(`/track/${current.id}`)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-dmp-charcoal border-t border-dmp-green/30 shadow-glow">
      <div
        className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 cursor-pointer"
        onClick={handleBarClick}
        title="View track details"
      >
        <div className="flex items-center gap-3 min-w-0 w-48 shrink-0">
          <img
            src={current.cover_url || '/favicon.svg'}
            alt=""
            className="w-11 h-11 rounded-md object-cover border border-white/10"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{current.title}</p>
            <p className="text-xs text-dmp-white/50 truncate">{current.artist}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-5">
            <button onClick={prev} className="text-dmp-white/70 hover:text-dmp-yellow" aria-label="Previous">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 6h2v12H6zM20 6L9 12l11 6V6z"/></svg>
            </button>
            <button onClick={toggle} className="bg-dmp-green hover:bg-dmp-greendark text-black rounded-full w-10 h-10 flex items-center justify-center" aria-label="Play/Pause">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button onClick={next} className="text-dmp-white/70 hover:text-dmp-yellow" aria-label="Next">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M16 6h2v12h-2zM4 6l11 6-11 6V6z"/></svg>
            </button>
          </div>
          <div className="w-full flex items-center gap-2 max-w-xl" data-waveform>
            <span className="text-[11px] text-dmp-white/40 w-9 text-right">{fmt(progress)}</span>
            <Waveform
              url={current.preview_url}
              progress={progress}
              duration={duration}
              onSeek={seek}
              height={28}
              bars={72}
            />
            <span className="text-[11px] text-dmp-white/40 w-9">{fmt(duration)}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 w-32 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-dmp-white/50"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.06A4.5 4.5 0 0016.5 12z"/></svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-dmp-yellow h-1"
          />
        </div>
      </div>
    </div>
  )
}

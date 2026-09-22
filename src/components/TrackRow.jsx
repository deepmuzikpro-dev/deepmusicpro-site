import { Link } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext.jsx'

function formatCount(n) {
  n = n || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function TrackRow({ track, list, index }) {
  const { playTrack, current, isPlaying } = usePlayer()
  const isCurrent = current?.id === track.id

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-white/5 ${isCurrent ? 'bg-white/5' : ''}`}>
      <span className="w-5 text-center text-xs text-dmp-white/40 shrink-0">
        {isCurrent && isPlaying ? (
          <span className="text-dmp-green">▶</span>
        ) : (
          index + 1
        )}
      </span>
      <button onClick={() => playTrack(track, list)} className="shrink-0">
        <img
          src={track.cover_url || '/favicon.svg'}
          alt=""
          className="w-11 h-11 rounded-md object-cover border border-white/10 group-hover:border-dmp-green/50"
        />
      </button>
      <Link to={`/track/${track.id}`} className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isCurrent ? 'text-dmp-green' : 'text-dmp-white'}`}>
          {track.title}
          {track.is_featured && track.featured_until && new Date(track.featured_until) > new Date() && (
            <span className="badge bg-dmp-yellow text-black !py-0 !px-1.5 text-[9px] shrink-0">FEATURED</span>
          )}
        </p>
        <p className="text-xs text-dmp-white/50 truncate">
          {track.artist} {track.bpm ? `· ${track.bpm} BPM` : ''} {track.key ? `· ${track.key}` : ''}
        </p>
      </Link>
      <span className="hidden sm:inline-block badge bg-white/10 text-dmp-white/70 capitalize">
        {track.genre?.replace('_', ' ')}
      </span>
      <span className="hidden sm:flex items-center gap-1 text-xs text-dmp-white/40 shrink-0" title={`${track.play_count || 0} plays`}>
        ▶ {formatCount(track.play_count)}
      </span>
      <span className="hidden sm:flex items-center gap-1 text-xs text-dmp-white/40 shrink-0">
        ♥ {formatCount(track.like_count)}
      </span>
      <Link to={`/track/${track.id}`} className="btn-outline !py-1 !px-3 text-xs shrink-0">
        License
      </Link>
    </div>
  )
}

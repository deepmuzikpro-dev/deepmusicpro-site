import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import TrackRow from '../components/TrackRow.jsx'
import Waveform from '../components/Waveform.jsx'
import CommentSection from '../components/CommentSection.jsx'

const LICENSES = [
  { key: 'basic', label: 'Basic Lease', desc: 'MP3, untagged. Non-exclusive.' },
  { key: 'premium', label: 'Premium Lease', desc: 'WAV + MP3, untagged. Non-exclusive.' },
  { key: 'exclusive', label: 'Exclusive Rights', desc: 'Full ownership transfer. Track removed from store.' },
]

export default function TrackDetail() {
  const { id } = useParams()
  const [track, setTrack] = useState(null)
  const [related, setRelated] = useState([])
  const [addedLicense, setAddedLicense] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const { playTrack, current, isPlaying, toggle, progress, duration, seek } = usePlayer()
  const { addItem } = useCart()
  const { user } = useAuth()

  useEffect(() => {
    supabase.from('tracks').select('*').eq('id', id).single().then(({ data }) => setTrack(data))
  }, [id])

  useEffect(() => {
    if (!track) return
    supabase
      .from('tracks')
      .select('*')
      .eq('is_published', true)
      .eq('genre', track.genre)
      .neq('id', track.id)
      .limit(4)
      .then(({ data }) => setRelated(data || []))
  }, [track?.id])

  useEffect(() => {
    if (!user || !track) return
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('track_id', track.id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data))
  }, [user, track?.id])

  if (!track) return <div className="max-w-3xl mx-auto px-4 py-10 text-dmp-white/50">Loading…</div>

  const isCurrent = current?.id === track.id

  function handlePlay() {
    if (isCurrent) toggle()
    else playTrack(track, [track])
  }

  function handleLicense(licenseKey) {
    const priceMap = { basic: track.price_basic, premium: track.price_premium, exclusive: track.price_exclusive }
    addItem({
      id: track.id,
      type: 'track_license',
      license: licenseKey,
      title: `${track.title} — ${licenseKey} license`,
      price: priceMap[licenseKey],
      image: track.cover_url,
    })
    setAddedLicense(licenseKey)
  }

  async function toggleFavorite() {
    if (!user) return
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('track_id', track.id)
      setIsFavorite(false)
      setTrack((t) => ({ ...t, like_count: Math.max(0, (t.like_count || 1) - 1) }))
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, track_id: track.id })
      setIsFavorite(true)
      setTrack((t) => ({ ...t, like_count: (t.like_count || 0) + 1 }))
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid sm:grid-cols-2 gap-10">
        <div>
          <img
            src={track.cover_url || '/favicon.svg'}
            alt={track.title}
            className="w-full aspect-square object-cover rounded-xl border border-white/10 mb-4"
          />
          <div className="flex gap-2 mb-3">
            <button onClick={handlePlay} className="btn-primary flex-1">
              {isCurrent && isPlaying ? 'Pause Preview' : 'Play Preview'}
            </button>
            <button
              onClick={toggleFavorite}
              disabled={!user}
              className={`btn-outline !px-4 flex items-center gap-1 ${isFavorite ? '!border-dmp-red !text-dmp-red' : ''}`}
              title={!user ? 'Sign in to like' : isFavorite ? 'Unlike' : 'Like'}
            >
              <span>{isFavorite ? '♥' : '♡'}</span>
              <span className="text-xs">{track.like_count || 0}</span>
            </button>
          </div>
          <Waveform
            url={track.preview_url}
            progress={isCurrent ? progress : 0}
            duration={isCurrent ? duration : 0}
            onSeek={(t) => { if (!isCurrent) playTrack(track, [track]); seek(t) }}
            height={48}
          />
        </div>
        <div>
          <span className="badge bg-dmp-red text-white mb-3 inline-block capitalize">{track.genre?.replace('_', ' ')}</span>
          <h1 className="font-display font-extrabold text-3xl mb-1">{track.title}</h1>
          <p className="text-dmp-white/50 mb-6">
            {track.artist} {track.bpm ? `· ${track.bpm} BPM` : ''} {track.key ? `· ${track.key}` : ''} · {track.play_count || 0} plays · {track.like_count || 0} likes
          </p>

          <div className="flex flex-col gap-3">
            {LICENSES.map((lic) => (
              <div key={lic.key} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{lic.label}</p>
                  <p className="text-xs text-dmp-white/50">{lic.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-dmp-green font-display font-bold mb-1">
                    ${Number(track[`price_${lic.key}`]).toFixed(2)}
                  </p>
                  <button onClick={() => handleLicense(lic.key)} className="btn-outline !py-1 !px-3 text-xs">
                    {addedLicense === lic.key ? 'Added ✓' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {addedLicense && (
            <Link to="/cart" className="block mt-4 text-dmp-green text-sm hover:underline">
              Go to cart →
            </Link>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display font-bold text-xl mb-4">You might also like</h2>
          <div className="flex flex-col gap-1">
            {related.map((t, i) => (
              <TrackRow key={t.id} track={t} list={related} index={i} />
            ))}
          </div>
        </div>
      )}

      <CommentSection trackId={track.id} />
    </div>
  )
}

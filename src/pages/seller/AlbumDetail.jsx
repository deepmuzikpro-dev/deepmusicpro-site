import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function AlbumDetail() {
  const { id } = useParams()
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [artist, setArtist] = useState(null)
  const [current, setCurrent] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      setLoaded(false)
      const { data: a } = await supabase.from('albums').select('*').eq('id', id).maybeSingle()
      setAlbum(a || null)
      if (a) {
        const [{ data: t }, { data: p }] = await Promise.all([
          supabase.from('album_tracks').select('*').eq('album_id', id).order('track_number'),
          supabase.from('public_profiles').select('*').eq('id', a.seller_id).maybeSingle(),
        ])
        setTracks(t || [])
        setArtist(p || null)
      }
      setLoaded(true)
    }
    load()
  }, [id])

  if (!loaded) return <p className="max-w-4xl mx-auto px-4 py-10 text-dmp-white/50">Loading...</p>
  if (!album) return <p className="max-w-4xl mx-auto px-4 py-10 text-dmp-white/50">Album not found.</p>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {album.cover_url ? (
          <img src={album.cover_url} alt={album.title} className="w-full sm:w-64 aspect-square rounded-2xl object-cover" />
        ) : (
          <div className="w-full sm:w-64 aspect-square rounded-2xl bg-gradient-to-br from-dmp-green/40 via-dmp-charcoal to-dmp-red/40 flex items-center justify-center text-6xl">💿</div>
        )}
        <div className="flex flex-col gap-2 justify-end">
          {!album.is_published && <span className="badge bg-dmp-yellow text-black self-start">Hidden draft</span>}
          <h1 className="font-display font-extrabold text-3xl">{album.title}</h1>
          {artist && (
            <Link to={`/u/${artist.id}`} className="text-dmp-green hover:underline">{artist.display_name}</Link>
          )}
          <p className="text-dmp-white/50 text-sm">{tracks.length} tracks</p>
          <p className="font-display font-bold text-2xl text-dmp-yellow">${Number(album.price).toFixed(2)}</p>
          <button className="btn-primary self-start opacity-60 cursor-not-allowed" disabled>
            Purchase opens soon
          </button>
        </div>
      </div>

      {album.description && <p className="text-dmp-white/80 whitespace-pre-line mb-8 max-w-2xl">{album.description}</p>}

      <h2 className="font-display font-bold text-xl mb-3">Tracks</h2>
      {current !== null && tracks[current] && (
        <div className="card p-3 mb-3">
          <p className="text-xs text-dmp-white/50 mb-1">Now playing: {tracks[current].title}</p>
          <audio
            key={tracks[current].id}
            src={tracks[current].preview_url}
            controls
            autoPlay
            className="w-full"
            onEnded={() => setCurrent((i) => (i + 1 < tracks.length ? i + 1 : null))}
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setCurrent(i)}
            className={`card p-3 flex items-center gap-3 text-left hover:border-dmp-green/60 transition-colors ${current === i ? 'border-dmp-green' : ''}`}
          >
            <span className="text-dmp-white/40 text-sm w-6">{t.track_number}</span>
            <span className="flex-1 text-sm font-semibold">{t.title}</span>
            <span className="text-dmp-green text-sm">{current === i ? 'Playing' : 'Play'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
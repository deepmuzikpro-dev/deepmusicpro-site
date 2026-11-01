import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function AlbumDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [artist, setArtist] = useState(null)
  const [current, setCurrent] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [owned, setOwned] = useState(false)

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

  useEffect(() => {
    if (!user) { setOwned(false); return }
    supabase
      .from('order_items')
      .select('id, orders!inner(status, user_id)')
      .eq('album_id', id)
      .eq('orders.status', 'paid')
      .eq('orders.user_id', user.id)
      .limit(1)
      .then(({ data }) => setOwned((data || []).length > 0))
  }, [id, user])

  function buy() {
    addItem({
      id: album.id,
      type: 'album',
      title: `${album.title} (album)`,
      price: Number(album.price),
      image: album.cover_url,
    })
    navigate('/cart')
  }

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
          <p className="text-dmp-white/50 text-sm">{tracks.length} tracks - MP3 and WAV downloads</p>
          <p className="font-display font-bold text-2xl text-dmp-yellow">${Number(album.price).toFixed(2)}</p>
          {owned ? (
            <Link to={`/album/${album.id}/download`} className="btn-primary self-start">Download your album</Link>
          ) : album.is_published ? (
            <button onClick={buy} className="btn-primary self-start">Buy album - ${Number(album.price).toFixed(2)}</button>
          ) : null}
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
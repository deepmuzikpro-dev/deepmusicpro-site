import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { usePlayer } from '../context/PlayerContext.jsx'

const TABS = [
  { key: 'orders', label: 'Orders & Downloads' },
  { key: 'favorites', label: 'Liked Tracks' },
]

function downloadUrl(path) {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/${path}`
}

export default function Account() {
  const { user, profile, loading } = useAuth()
  const { playTrack } = usePlayer()
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []))

    supabase
      .from('favorites')
      .select('id, created_at, tracks(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setFavorites(data || []))
  }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  async function removeFavorite(trackId) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('track_id', trackId)
    setFavorites((prev) => prev.filter((f) => f.tracks?.id !== trackId))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-1">My Account</h1>
      <p className="text-dmp-white/50 mb-8">{profile?.display_name} · {user.email}</p>

      <div className="card p-5 mb-4 flex items-center justify-between">
        <span className="text-dmp-white/60">Rewards balance</span>
        <span className="font-display font-bold text-xl text-dmp-yellow">{profile?.points_balance ?? 0} pts</span>
      </div>

      <Link to="/sell" className="card p-5 mb-8 flex items-center justify-between hover:border-dmp-green/50 transition-colors">
        <div>
          <span className="text-dmp-white/60">My store & affiliate earnings</span>
          <p className="text-xs text-dmp-white/40 mt-0.5">
            {profile?.seller_tier === 'premium' ? 'Premium seller — 0% commission' : 'Basic seller — 8% commission'}
          </p>
        </div>
        <span className="text-dmp-green text-sm font-semibold">Manage &rarr;</span>
      </Link>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`badge px-3 py-1.5 ${tab === t.key ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        orders.length === 0 ? (
          <p className="text-dmp-white/50">No purchases yet. <Link to="/shop" className="text-dmp-green hover:underline">Browse the shop</Link>.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dmp-white/50">{new Date(o.created_at).toLocaleDateString()}</span>
                  <span className={`badge ${o.status === 'paid' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/60'}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {o.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm gap-3">
                      <span className="truncate">{item.title}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {o.status === 'paid' && item.download_path && (
                          <a className="text-dmp-green hover:underline" href={downloadUrl(item.download_path)} target="_blank" rel="noreferrer">
                            Download
                          </a>
                        )}
                        {o.status === 'paid' && item.license_pdf_path && (
                          <a className="text-dmp-yellow hover:underline" href={downloadUrl(item.license_pdf_path)} target="_blank" rel="noreferrer">
                            License PDF
                          </a>
                        )}
                        {o.status !== 'paid' && <span className="text-dmp-white/30">—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'favorites' && (
        favorites.length === 0 ? (
          <p className="text-dmp-white/50">No liked tracks yet. <Link to="/browse" className="text-dmp-green hover:underline">Start streaming</Link>.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {favorites.map((f) => f.tracks && (
              <div key={f.id} className="card p-3 flex items-center justify-between gap-3">
                <button
                  className="flex items-center gap-3 min-w-0 text-left"
                  onClick={() => playTrack(f.tracks, favorites.map((x) => x.tracks).filter(Boolean))}
                >
                  <img src={f.tracks.cover_url || '/favicon.svg'} alt="" className="w-11 h-11 rounded-md object-cover border border-white/10 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{f.tracks.title}</p>
                    <p className="text-xs text-dmp-white/50 truncate">{f.tracks.artist}</p>
                  </div>
                </button>
                <button onClick={() => removeFavorite(f.tracks.id)} className="text-dmp-red/80 hover:text-dmp-red text-sm shrink-0">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SellerDashboard() {
  const { user, loading } = useAuth()
  const [tracks, setTracks] = useState([])
  const [products, setProducts] = useState([])
  const [tab, setTab] = useState('tracks')

  useEffect(() => {
    if (!user) return
    supabase.from('tracks').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setTracks(data || []))
    supabase.from('products').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setProducts(data || []))
  }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  async function togglePublished(table, id, current, setList) {
    await supabase.from(table).update({ is_published: !current }).eq('id', id)
    setList((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: !current } : r)))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/sell" className="text-dmp-white/50 text-sm hover:underline">&larr; My store</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="font-display font-extrabold text-2xl">My store</h1>
        <Link to="/sell/upload" className="btn-primary !py-1.5 !px-4 text-sm">+ List new</Link>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('tracks')} className={`badge px-3 py-1.5 ${tab === 'tracks' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}>Tracks ({tracks.length})</button>
        <button onClick={() => setTab('products')} className={`badge px-3 py-1.5 ${tab === 'products' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}>Products ({products.length})</button>
      </div>

      {tab === 'tracks' && (
        tracks.length === 0 ? (
          <p className="text-dmp-white/50">Nothing listed yet. <Link to="/sell/upload" className="text-dmp-green hover:underline">List your first beat</Link>.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tracks.map((t) => (
              <div key={t.id} className="card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-2">
                    {t.title}
                    {t.is_featured && new Date(t.featured_until) > new Date() && (
                      <span className="badge bg-dmp-yellow text-black !py-0.5 !px-2 text-[10px]">Featured</span>
                    )}
                  </p>
                  <p className="text-xs text-dmp-white/50">{t.play_count || 0} plays · {t.like_count || 0} likes</p>
                </div>
                <button
                  onClick={() => togglePublished('tracks', t.id, t.is_published, setTracks)}
                  className={`badge shrink-0 ${t.is_published ? 'bg-white/10 text-dmp-white/70' : 'bg-dmp-red/20 text-dmp-red'}`}
                >
                  {t.is_published ? 'Live' : 'Unpublished'}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'products' && (
        products.length === 0 ? (
          <p className="text-dmp-white/50">Nothing listed yet. <Link to="/sell/upload" className="text-dmp-green hover:underline">List your first product</Link>.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.id} className="card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-2">
                    {p.title}
                    {p.is_featured && new Date(p.featured_until) > new Date() && (
                      <span className="badge bg-dmp-yellow text-black !py-0.5 !px-2 text-[10px]">Featured</span>
                    )}
                  </p>
                  <p className="text-xs text-dmp-white/50">${Number(p.price).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => togglePublished('products', p.id, p.is_published, setProducts)}
                  className={`badge shrink-0 ${p.is_published ? 'bg-white/10 text-dmp-white/70' : 'bg-dmp-red/20 text-dmp-red'}`}
                >
                  {p.is_published ? 'Live' : 'Unpublished'}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SellerAlbums() {
  const { user, loading } = useAuth()
  const [albums, setAlbums] = useState([])
  const [busy, setBusy] = useState(true)

  async function load() {
    if (!user) return
    const { data } = await supabase
      .from('albums')
      .select('*, album_tracks(count)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
    setAlbums(data || [])
    setBusy(false)
  }

  useEffect(() => { load() }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  async function togglePublish(a) {
    await supabase.from('albums').update({ is_published: !a.is_published }).eq('id', a.id)
    load()
  }

  async function remove(a) {
    if (!confirm(`Delete "${a.title}" and all its tracks?`)) return
    await supabase.from('albums').delete().eq('id', a.id)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/sell" className="text-dmp-white/50 text-sm hover:underline">&larr; My store</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="font-display font-extrabold text-2xl">My albums</h1>
        <Link to="/sell/album/new" className="btn-primary !py-1.5 !px-4 text-sm">+ New album</Link>
      </div>

      {busy ? (
        <p className="text-dmp-white/50">Loading...</p>
      ) : albums.length === 0 ? (
        <p className="text-dmp-white/50">You have not listed an album yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {albums.map((a) => (
            <div key={a.id} className="card p-3 flex items-center gap-3">
              {a.cover_url ? (
                <img src={a.cover_url} alt={a.title} className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center">💿</div>
              )}
              <div className="flex-1 min-w-0">
                <Link to={`/album/${a.id}`} className="text-sm font-semibold hover:text-dmp-green truncate block">{a.title}</Link>
                <p className="text-xs text-dmp-white/50">
                  ${Number(a.price).toFixed(2)} - {a.album_tracks?.[0]?.count ?? 0} tracks - {a.is_published ? 'Live' : 'Hidden'}
                </p>
              </div>
              <button onClick={() => togglePublish(a)} className="btn-outline !py-1 !px-3 text-xs">
                {a.is_published ? 'Hide' : 'Publish'}
              </button>
              <button onClick={() => remove(a)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
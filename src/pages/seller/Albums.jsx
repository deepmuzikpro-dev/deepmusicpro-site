import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Albums() {
  const [albums, setAlbums] = useState([])
  const [artists, setArtists] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('albums')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      setAlbums(data || [])
      const ids = [...new Set((data || []).map((a) => a.seller_id))]
      if (ids.length) {
        const { data: p } = await supabase.from('public_profiles').select('id, display_name').in('id', ids)
        setArtists(Object.fromEntries((p || []).map((x) => [x.id, x.display_name])))
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-extrabold text-3xl mb-6">Albums</h1>
      {loading ? (
        <p className="text-dmp-white/50">Loading...</p>
      ) : albums.length === 0 ? (
        <p className="text-dmp-white/50">No albums yet. Artists can list one from the Sell page.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {albums.map((a) => (
            <Link key={a.id} to={`/album/${a.id}`} className="group">
              {a.cover_url ? (
                <img src={a.cover_url} alt={a.title} className="w-full aspect-square rounded-xl object-cover group-hover:ring-2 ring-dmp-green transition" />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-dmp-green/40 via-dmp-charcoal to-dmp-red/40 flex items-center justify-center text-4xl">💿</div>
              )}
              <p className="mt-2 text-sm font-semibold truncate">{a.title}</p>
              <p className="text-xs text-dmp-white/50 truncate">{artists[a.seller_id] || 'Artist'} - ${Number(a.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
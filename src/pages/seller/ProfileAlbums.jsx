import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ProfileAlbums({ sellerId }) {
  const [albums, setAlbums] = useState([])

  useEffect(() => {
    supabase
      .from('albums')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAlbums(data || []))
  }, [sellerId])

  if (albums.length === 0) return null

  return (
    <div className="mb-10">
      <h2 className="font-display font-bold text-2xl mb-4">Albums</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {albums.map((a) => (
          <Link key={a.id} to={`/album/${a.id}`} className="group">
            {a.cover_url ? (
              <img src={a.cover_url} alt={a.title} className="w-full aspect-square rounded-xl object-cover group-hover:ring-2 ring-dmp-green transition" />
            ) : (
              <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-dmp-green/40 via-dmp-charcoal to-dmp-red/40 flex items-center justify-center text-4xl">💿</div>
            )}
            <p className="mt-2 text-sm font-semibold truncate">{a.title}</p>
            <p className="text-xs text-dmp-white/50">${Number(a.price).toFixed(2)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
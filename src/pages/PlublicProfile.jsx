import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import TrackRow from '../components/TrackRow.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function PublicProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [person, setPerson] = useState(null)
  const [tracks, setTracks] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: p }, { data: t }, { data: pr }] = await Promise.all([
        supabase.from('public_profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('tracks').select('*').eq('seller_id', id).eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('seller_id', id).eq('is_published', true).order('created_at', { ascending: false }),
      ])
      setPerson(p || null)
      setTracks(t || [])
      setProducts(pr || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p className="max-w-4xl mx-auto px-4 py-10 text-dmp-white/50">Loading...</p>
  if (!person) return <p className="max-w-4xl mx-auto px-4 py-10 text-dmp-white/50">Profile not found.</p>

  const name = person.display_name || 'Deepmusicpro user'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-5 mb-8">
        {person.avatar_url ? (
          <img src={person.avatar_url} alt={name} className="w-24 h-24 rounded-full object-cover bg-white/10" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-dmp-green text-black flex items-center justify-center font-display font-extrabold text-3xl">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display font-extrabold text-3xl">{name}</h1>
          <p className="text-dmp-white/40 text-sm">
            Member since {new Date(person.created_at).toLocaleDateString()}
          </p>
          {user?.id === id && (
            <Link to="/account/profile" className="text-dmp-green text-sm hover:underline">Edit profile</Link>
          )}
        </div>
      </div>

      {person.bio && <p className="text-dmp-white/80 whitespace-pre-line mb-10 max-w-2xl">{person.bio}</p>}

      <h2 className="font-display font-bold text-2xl mb-4">Music</h2>
      {tracks.length === 0 ? (
        <p className="text-dmp-white/50 mb-10">No music listed yet.</p>
      ) : (
        <div className="flex flex-col gap-1 mb-10">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} list={tracks} index={i} />
          ))}
        </div>
      )}

      <h2 className="font-display font-bold text-2xl mb-4">Guides & Kits</h2>
      {products.length === 0 ? (
        <p className="text-dmp-white/50">Nothing listed yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
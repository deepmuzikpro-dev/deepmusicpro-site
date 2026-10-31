import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import TrackRow from '../components/TrackRow.jsx'
import ProductCard from '../components/ProductCard.jsx'

function Cover({ track, className = '' }) {
  return track?.cover_url ? (
    <img src={track.cover_url} alt={track.title} loading="lazy" className={`object-cover bg-white/10 ${className}`} />
  ) : (
    <div className={`bg-gradient-to-br from-dmp-green/40 via-dmp-charcoal to-dmp-red/40 flex items-center justify-center text-3xl ${className}`}>🎵</div>
  )
}

function TrackCard({ track }) {
  return (
    <Link to={`/track/${track.id}`} className="group w-40 sm:w-44 shrink-0 snap-start">
      <Cover track={track} className="w-full aspect-square rounded-xl group-hover:ring-2 ring-dmp-green transition" />
      <p className="mt-2 text-sm font-semibold truncate">{track.title}</p>
      <p className="text-xs text-dmp-white/50 truncate">{track.artist}</p>
    </Link>
  )
}

function SectionHeader({ title, to, linkText = 'See all' }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="font-display font-extrabold text-2xl">{title}</h2>
      {to && <Link to={to} className="text-dmp-green text-sm font-semibold hover:underline">{linkText}</Link>}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [genres, setGenres] = useState([])
  const [trending, setTrending] = useState([])
  const [fresh, setFresh] = useState([])
  const [featured, setFeatured] = useState([])
  const [products, setProducts] = useState([])
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: g }, { data: t }, { data: n }, { data: f }, { data: p }] = await Promise.all([
        supabase.from('genres').select('*').eq('is_active', true).order('sort_order').limit(12),
        supabase.from('tracks').select('*').eq('is_published', true).order('play_count', { ascending: false }).limit(10),
        supabase.from('tracks').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('tracks').select('*').eq('is_published', true).eq('is_featured', true).gt('featured_until', new Date().toISOString()).limit(6),
        supabase.from('products').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
      ])
      setGenres(g || [])
      setTrending(t || [])
      setFresh(n || [])
      setFeatured(f || [])
      setProducts(p || [])

      const ids = [...new Set([...(t || []), ...(n || [])].map((x) => x.seller_id).filter(Boolean))].slice(0, 8)
      if (ids.length) {
        const { data: c } = await supabase.from('public_profiles').select('*').in('id', ids)
        setCreators(c || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    navigate(`/browse?q=${encodeURIComponent(q.trim())}`)
  }

  const heroCovers = trending.slice(0, 3)

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-dmp-charcoal to-dmp-black border-b border-white/10">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-dmp-green/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 w-96 h-96 rounded-full bg-dmp-red/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div className="flex flex-col gap-5">
            <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-tight">
              Stream the sound.<br />
              <span className="text-dmp-green">Cop the kit.</span>{' '}
              <span className="text-dmp-yellow">Build the catalog.</span>
            </h1>
            <p className="text-dmp-white/70 max-w-xl text-lg">
              House, hip-hop, reggae, reggaetón and more — new music streaming free,
              plus ebooks, PDF guides, sample kits and drum kits built for
              producers ready to level up.
            </p>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
              <input
                className="input flex-1"
                placeholder="Search songs, beats, tags..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn-primary shrink-0">Search</button>
            </form>
            <div className="flex gap-3 flex-wrap">
              <Link to="/browse" className="btn-outline">Play Music</Link>
              <Link to="/shop" className="btn-outline">Shop Kits & Guides</Link>
            </div>
          </div>

          <div className="relative hidden lg:flex justify-center items-center h-80">
            {heroCovers.length === 0 ? (
              <div className="w-56 h-56 rounded-3xl bg-gradient-to-br from-dmp-green/40 via-dmp-charcoal to-dmp-red/40 flex items-center justify-center text-6xl">🎵</div>
            ) : (
              heroCovers.map((t, i) => (
                <Link
                  key={t.id}
                  to={`/track/${t.id}`}
                  className="absolute transition-transform hover:z-20 hover:scale-105"
                  style={{ transform: `translateX(${(i - 1) * 110}px) rotate(${(i - 1) * 7}deg)`, zIndex: 10 - i }}
                >
                  <Cover track={t} className="w-52 h-52 rounded-2xl shadow-2xl ring-1 ring-white/10" />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* GENRE STRIP */}
      {genres.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {genres.map((g) => (
              <Link
                key={g.id}
                to={`/browse?genre=${g.slug}`}
                className="badge shrink-0 px-4 py-2 bg-white/10 text-dmp-white/80 hover:bg-dmp-green hover:text-black transition-colors"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TRENDING */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <SectionHeader title="Trending now 🔥" to="/browse" />
        {loading ? (
          <p className="text-dmp-white/50">Loading...</p>
        ) : trending.length === 0 ? (
          <p className="text-dmp-white/50">No tracks published yet — check back soon.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto snap-x pb-3 [scrollbar-width:none]">
            {trending.map((t) => <TrackCard key={t.id} track={t} />)}
          </div>
        )}
      </section>

      {/* FEATURED (only when sellers have active featured slots) */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <SectionHeader title="Featured picks" />
          <div className="flex flex-col gap-1">
            {featured.map((t, i) => (
              <TrackRow key={t.id} track={t} list={featured} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* NEW RELEASES */}
      {fresh.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <SectionHeader title="New releases" to="/browse" />
          <div className="flex flex-col gap-1">
            {fresh.slice(0, 6).map((t, i) => (
              <TrackRow key={t.id} track={t} list={fresh.slice(0, 6)} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* TOP CREATORS */}
      {creators.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <SectionHeader title="Creators to watch" />
          <div className="flex gap-5 overflow-x-auto pb-3 [scrollbar-width:none]">
            {creators.map((c) => (
              <Link key={c.id} to={`/u/${c.id}`} className="group w-28 shrink-0 text-center">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.display_name} className="w-24 h-24 mx-auto rounded-full object-cover ring-2 ring-transparent group-hover:ring-dmp-green transition" />
                ) : (
                  <div className="w-24 h-24 mx-auto rounded-full bg-dmp-green text-black flex items-center justify-center font-display font-extrabold text-3xl">
                    {(c.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="mt-2 text-sm font-semibold truncate">{c.display_name || 'Creator'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* SHOP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <SectionHeader title="Guides & Kits" to="/shop" />
        {products.length === 0 ? (
          <p className="text-dmp-white/50">Shop is empty right now — new drops coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* CALLS TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 grid md:grid-cols-2 gap-4">
        <div className="card p-8 flex flex-col gap-3 border-dmp-green/40">
          <h3 className="font-display font-bold text-2xl">Sell your own music & guides</h3>
          <p className="text-dmp-white/60">
            Open your own store inside Deepmusicpro — keep 92% on Basic, or go Premium for 0%
            commission and a guaranteed featured slot every week.
          </p>
          <Link to="/sell" className="btn-primary self-start">Start Selling</Link>
        </div>
        <div className="card p-8 flex flex-col gap-3 border-dmp-yellow/40">
          <h3 className="font-display font-bold text-2xl">Earn while you listen</h3>
          <p className="text-dmp-white/60">
            Join Deepmusicpro Rewards — points for streaming and buying, redeemable for free licenses and kits.
          </p>
          <Link to="/rewards" className="btn-primary self-start">Join Rewards</Link>
        </div>
      </section>
    </div>
  )
}
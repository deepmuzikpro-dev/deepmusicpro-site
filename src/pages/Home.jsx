import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import TrackRow from '../components/TrackRow.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function Home() {
  const [tracks, setTracks] = useState([])
  const [products, setProducts] = useState([])
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: p }, { data: f }] = await Promise.all([
        supabase.from('tracks').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(8),
        supabase.from('products').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
        // Featured rail: Premium sellers' new uploads (auto-flagged for 7
        // days), plus, once that runs dry, whatever's trending by plays —
        // this is how Basic sellers earn featured placement organically.
        supabase.from('tracks').select('*').eq('is_published', true).eq('is_featured', true).gt('featured_until', new Date().toISOString()).limit(6),
      ])
      setTracks(t || [])
      setProducts(p || [])
      if ((f || []).length >= 4) {
        setFeatured(f)
      } else {
        const { data: trending } = await supabase
          .from('tracks')
          .select('*')
          .eq('is_published', true)
          .order('play_count', { ascending: false })
          .limit(6)
        setFeatured(trending || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-dmp-charcoal to-dmp-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-start gap-6">
          <span className="badge bg-dmp-red text-white">100% Deepmusicpro Catalog</span>
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-tight max-w-3xl">
            Stream the sound.<br />
            <span className="text-dmp-green">Cop the kit.</span>{' '}
            <span className="text-dmp-yellow">Build the catalog.</span>
          </h1>
          <p className="text-dmp-white/70 max-w-xl text-lg">
            Exclusive drill, type beat and lo-fi instrumentals streaming free —
            plus ebooks, PDF guides, sample kits and drum kits built for
            producers ready to level up.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/browse" className="btn-primary">Start Streaming</Link>
            <Link to="/shop" className="btn-outline">Shop Kits & Guides</Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-2xl flex items-center gap-2">
              Featured <span className="badge bg-dmp-yellow text-black">🔥</span>
            </h2>
          </div>
          <div className="flex flex-col gap-1">
            {featured.map((t, i) => (
              <TrackRow key={t.id} track={t} list={featured} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-2xl">Fresh on the Platform</h2>
          <Link to="/browse" className="text-dmp-green text-sm font-semibold hover:underline">See all</Link>
        </div>
        {loading ? (
          <p className="text-dmp-white/50">Loading tracks…</p>
        ) : tracks.length === 0 ? (
          <p className="text-dmp-white/50">No tracks published yet — check back soon.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} list={tracks} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-2xl">Guides & Kits</h2>
          <Link to="/shop" className="text-dmp-green text-sm font-semibold hover:underline">See all</Link>
        </div>
        {products.length === 0 ? (
          <p className="text-dmp-white/50">Shop is empty right now — new drops coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-6">
        <div className="card p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-dmp-green/40">
          <div>
            <h3 className="font-display font-bold text-2xl mb-1">Sell your own beats & guides</h3>
            <p className="text-dmp-white/60">
              Open your own store inside Deepmusicpro — keep 92% on Basic, or go Premium for 0%
              commission and a guaranteed featured slot every week.
            </p>
          </div>
          <Link to="/sell" className="btn-primary shrink-0">Start Selling</Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="card p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-dmp-yellow/40">
          <div>
            <h3 className="font-display font-bold text-2xl mb-1">Earn while you listen</h3>
            <p className="text-dmp-white/60">Join Deepmusicpro Rewards — points for streaming and buying, redeemable for free licenses and kits.</p>
          </div>
          <Link to="/rewards" className="btn-primary shrink-0">Join Rewards</Link>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'

const CATEGORIES = [
  { value: 'all', label: 'Everything' },
  { value: 'ebook', label: 'eBooks' },
  { value: 'pdf_guide', label: 'PDF Guides' },
  { value: 'sample_kit', label: 'Sample Kits' },
  { value: 'drum_kit', label: 'Drum Kits' },
]

export default function Shop() {
  const { category } = useParams()
  const active = category || 'all'
  const [products, setProducts] = useState([])
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase.from('products').select('*').eq('is_published', true).order('created_at', { ascending: false })
      if (active !== 'all') query = query.eq('category', active)
      const { data } = await query
      setProducts(data || [])
      setLoading(false)
    }
    load()
    if (active === 'all') {
      supabase.from('bundles').select('*').eq('is_published', true).order('created_at', { ascending: false }).then(({ data }) => setBundles(data || []))
    } else {
      setBundles([])
    }
  }, [active])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-extrabold text-3xl mb-6">Shop</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            to={c.value === 'all' ? '/shop' : `/shop/${c.value}`}
            className={`badge px-3 py-1.5 ${active === c.value ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {bundles.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display font-bold text-xl mb-4">Bundle Deals</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundles.map((b) => (
              <Link key={b.id} to={`/bundle/${b.id}`} className="card p-4 flex flex-col gap-2 border-dmp-yellow/40">
                <span className="badge bg-dmp-yellow text-black self-start">Bundle</span>
                <p className="font-semibold">{b.title}</p>
                <p className="text-dmp-white/50 text-sm">{b.description}</p>
                <p className="text-dmp-green font-display font-bold text-lg">${Number(b.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-dmp-white/50">Nothing here yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}

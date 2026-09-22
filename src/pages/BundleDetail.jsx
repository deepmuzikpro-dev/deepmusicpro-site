import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../context/CartContext.jsx'

export default function BundleDetail() {
  const { id } = useParams()
  const [bundle, setBundle] = useState(null)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    supabase
      .from('bundles')
      .select('*, bundle_items(*, tracks(title, genre), products(title, category))')
      .eq('id', id)
      .single()
      .then(({ data }) => setBundle(data))
  }, [id])

  if (!bundle) return <div className="max-w-3xl mx-auto px-4 py-10 text-dmp-white/50">Loading…</div>

  function handleAdd() {
    addItem({ id: bundle.id, type: 'bundle', title: bundle.title, price: bundle.price, image: bundle.cover_url })
    setAdded(true)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <span className="badge bg-dmp-yellow text-black mb-3 inline-block">Bundle</span>
      <h1 className="font-display font-extrabold text-3xl mb-2">{bundle.title}</h1>
      <p className="text-dmp-white/60 mb-6">{bundle.description}</p>
      <p className="text-dmp-green font-display font-extrabold text-3xl mb-6">${Number(bundle.price).toFixed(2)}</p>

      <h2 className="font-display font-bold text-lg mb-3">What's included</h2>
      <div className="flex flex-col gap-2 mb-8">
        {bundle.bundle_items.map((item) => (
          <div key={item.id} className="card p-3 flex items-center justify-between text-sm">
            <span>{item.item_type === 'track_license' ? item.tracks?.title : item.products?.title}</span>
            <span className="badge bg-white/10 text-dmp-white/60 capitalize">
              {item.item_type === 'track_license' ? `${item.license} license` : item.products?.category?.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      <button onClick={handleAdd} className="btn-primary w-full sm:w-auto" disabled={added}>
        {added ? 'Added to cart ✓' : 'Add Bundle to Cart'}
      </button>
      {added && (
        <Link to="/cart" className="block mt-3 text-dmp-green text-sm hover:underline">
          Go to cart →
        </Link>
      )}
    </div>
  )
}

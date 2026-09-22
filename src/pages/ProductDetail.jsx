import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../context/CartContext.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => setProduct(data))
  }, [id])

  if (!product) return <div className="max-w-3xl mx-auto px-4 py-10 text-dmp-white/50">Loading…</div>

  function handleAdd() {
    addItem({ id: product.id, type: 'product', title: product.title, price: product.price, image: product.cover_url })
    setAdded(true)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 gap-10">
      <img
        src={product.cover_url || '/favicon.svg'}
        alt={product.title}
        className="w-full aspect-square object-cover rounded-xl border border-white/10"
      />
      <div>
        <span className="badge bg-dmp-yellow text-black mb-3 inline-block capitalize">
          {product.category.replace('_', ' ')}
        </span>
        <h1 className="font-display font-extrabold text-3xl mb-3">{product.title}</h1>
        <p className="text-dmp-white/70 mb-6 whitespace-pre-line">{product.description}</p>
        <p className="text-dmp-green font-display font-extrabold text-3xl mb-6">
          ${Number(product.price).toFixed(2)}
        </p>
        {product.preview_audio_url && (
          <audio controls src={product.preview_audio_url} className="w-full mb-6" />
        )}
        <button onClick={handleAdd} className="btn-primary w-full sm:w-auto" disabled={added}>
          {added ? 'Added to cart ✓' : 'Add to Cart'}
        </button>
        {added && (
          <Link to="/cart" className="block mt-3 text-dmp-green text-sm hover:underline">
            Go to cart →
          </Link>
        )}
      </div>
    </div>
  )
}

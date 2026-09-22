import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { startCheckout } from '../lib/checkout'

export default function Cart() {
  const { items, removeItem, total, clearCart } = useCart()
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleCheckout() {
    setError('')
    if (!email) {
      setError('Enter an email so we can send your download links.')
      return
    }
    setLoading(true)
    try {
      await startCheckout(items, { email, userId: user?.id })
    } catch (err) {
      setError(err.message || 'Checkout failed. Try again.')
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-dmp-white/60 mb-4">Your cart is empty.</p>
        <Link to="/shop" className="btn-primary">Browse the Shop</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-6">Your Cart</h1>

      <div className="flex flex-col gap-3 mb-6">
        {items.map((item) => (
          <div key={`${item.id}:${item.license || 'default'}`} className="card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src={item.image || '/favicon.svg'} alt="" className="w-12 h-12 rounded-md object-cover border border-white/10 shrink-0" />
              <p className="text-sm font-medium truncate">{item.title}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-dmp-green font-semibold">${Number(item.price).toFixed(2)}</span>
              <button onClick={() => removeItem(item.id, item.license)} className="text-dmp-red/80 hover:text-dmp-red text-sm">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 mb-6">
        <div className="flex justify-between mb-4">
          <span className="text-dmp-white/60">Subtotal</span>
          <span className="font-display font-bold text-xl">${total.toFixed(2)}</span>
        </div>
        <label className="text-xs text-dmp-white/50 mb-1 block">Email for receipt & downloads</label>
        <input
          className="input mb-3"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        {error && <p className="text-dmp-red text-sm mb-3">{error}</p>}
        <button onClick={handleCheckout} disabled={loading} className="btn-primary w-full">
          {loading ? 'Redirecting to Stripe…' : 'Checkout with Stripe'}
        </button>
      </div>

      <button onClick={clearCart} className="text-dmp-white/40 text-xs hover:text-dmp-red">
        Clear cart
      </button>
    </div>
  )
}

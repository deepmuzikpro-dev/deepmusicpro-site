import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

export default function CheckoutSuccess() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-dmp-green/20 border border-dmp-green flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-dmp-green">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="font-display font-extrabold text-2xl mb-2">You're in.</h1>
      <p className="text-dmp-white/60 mb-8">
        Payment confirmed. Your download links and reward points will show up in your account
        shortly — check your email too.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/account" className="btn-primary">Go to My Account</Link>
        <Link to="/browse" className="btn-outline">Keep Browsing</Link>
      </div>
    </div>
  )
}

import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

const linkClass = ({ isActive }) =>
  `font-display text-sm font-semibold tracking-wide transition-colors ${
    isActive ? 'text-dmp-green' : 'text-dmp-white/80 hover:text-dmp-yellow'
  }`

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const { items } = useCart()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-dmp-black/95 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-full bg-dmp-green flex items-center justify-center font-display font-extrabold text-black">D</span>
          <span className="font-display font-extrabold text-lg tracking-tight">
            DEEP<span className="text-dmp-green">MUSIC</span><span className="text-dmp-red">PRO</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/browse" className={linkClass}>Stream Beats</NavLink>
          <NavLink to="/shop" className={linkClass}>Shop</NavLink>
          <NavLink to="/rewards" className={linkClass}>Rewards</NavLink>
          <NavLink to="/sell" className={linkClass}>Sell</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-dmp-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.994-4.693 2.598-7.152.075-.307-.145-.598-.46-.598H5.106M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-dmp-red text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {items.length}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-3">
              {isAdmin && (
                <Link to="/admin" className="badge bg-dmp-yellow text-black">Admin</Link>
              )}
              <Link to="/account" className="text-sm text-dmp-white/80 hover:text-dmp-green">
                {profile?.display_name || 'Account'}
              </Link>
              <button
                onClick={() => signOut().then(() => navigate('/'))}
                className="text-sm text-dmp-white/50 hover:text-dmp-red"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary hidden sm:inline-block !py-1.5 !px-4 text-sm">
              Sign in
            </Link>
          )}

          <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-3">
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/browse" className={linkClass} onClick={() => setOpen(false)}>Stream Beats</NavLink>
          <NavLink to="/shop" className={linkClass} onClick={() => setOpen(false)}>Shop</NavLink>
          <NavLink to="/rewards" className={linkClass} onClick={() => setOpen(false)}>Rewards</NavLink>
          <NavLink to="/sell" className={linkClass} onClick={() => setOpen(false)}>Sell</NavLink>
          {user ? (
            <>
              {isAdmin && <Link to="/admin" className={linkClass} onClick={() => setOpen(false)}>Admin</Link>}
              <Link to="/account" className={linkClass} onClick={() => setOpen(false)}>Account</Link>
              <button className="text-left text-dmp-red text-sm" onClick={() => { signOut(); setOpen(false) }}>Sign out</button>
            </>
          ) : (
            <Link to="/login" className={linkClass} onClick={() => setOpen(false)}>Sign in</Link>
          )}
        </div>
      )}
    </header>
  )
}

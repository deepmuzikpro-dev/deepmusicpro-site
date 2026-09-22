import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

export default function Rewards() {
  const { user, profile } = useAuth()
  const [catalog, setCatalog] = useState([])

  useEffect(() => {
    supabase
      .from('rewards_catalog')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => setCatalog(data || []))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-2">Deepmusicpro Rewards</h1>
      <p className="text-dmp-white/60 mb-8 max-w-2xl">
        Earn points every time you stream, sign in, or buy. Redeem them for free track licenses,
        sample kits, PDF guides, and discount codes.
      </p>

      {user ? (
        <div className="card p-6 mb-8 flex items-center justify-between border-dmp-yellow/40">
          <div>
            <p className="text-dmp-white/50 text-sm">Your balance</p>
            <p className="font-display font-extrabold text-3xl text-dmp-yellow">
              {profile?.points_balance ?? 0} pts
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-dmp-white/70">Sign in to start earning and track your points.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      )}

      <h2 className="font-display font-bold text-xl mb-4">Redeem</h2>
      {catalog.length === 0 ? (
        <p className="text-dmp-white/50">Reward items coming soon.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {catalog.map((r) => (
            <div key={r.id} className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-dmp-white/50">{r.description}</p>
              </div>
              <span className="badge bg-dmp-green text-black shrink-0">{r.cost_points} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-10">
        <div className="card p-4 text-center">
          <p className="font-display font-bold text-dmp-green text-2xl mb-1">+1 pt</p>
          <p className="text-xs text-dmp-white/50">per $1 spent</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display font-bold text-dmp-yellow text-2xl mb-1">+5 pts</p>
          <p className="text-xs text-dmp-white/50">daily sign-in</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display font-bold text-dmp-red text-2xl mb-1">+10 pts</p>
          <p className="text-xs text-dmp-white/50">per beat streamed to full length</p>
        </div>
      </div>
    </div>
  )
}

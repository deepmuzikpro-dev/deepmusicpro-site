import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

export default function Rewards() {
  const { user, profile } = useAuth()
  const [ranks, setRanks] = useState([])
  const [actions, setActions] = useState([])
  const [events, setEvents] = useState([])

  useEffect(() => {
    supabase.from('ranks').select('*').order('min_xp').then(({ data }) => setRanks(data || []))
    supabase.from('xp_actions').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setActions(data || []))
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('xp_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setEvents(data || []))
  }, [user])

  const xp = profile?.xp ?? 0
  const current = [...ranks].reverse().find((r) => r.min_xp <= xp) || ranks[0]
  const next = ranks.find((r) => r.min_xp > xp)
  const pct = next && current
    ? Math.min(100, Math.round(((xp - current.min_xp) / (next.min_xp - current.min_xp)) * 100))
    : 100
  const names = { purchase: 'Purchase', ...Object.fromEntries(actions.map((a) => [a.action, a.label])) }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-2">Ranks & XP</h1>
      <p className="text-dmp-white/60 mb-8 max-w-2xl">
        Earn XP by listening, liking, commenting, uploading and buying. Climb the ranks and show them off on your profile.
      </p>

      {user ? (
        <div className="card p-6 mb-8 border-dmp-yellow/40">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
            <div>
              <p className="text-dmp-white/50 text-sm">Your rank</p>
              <p className="font-display font-extrabold text-3xl text-dmp-yellow">{current?.name || 'Newcomer'}</p>
            </div>
            <p className="font-display font-bold text-xl">{xp} XP</p>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-dmp-green transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-dmp-white/50 mt-2">
            {next ? `${next.min_xp - xp} XP to ${next.name}` : 'You reached the top rank!'}
          </p>
        </div>
      ) : (
        <div className="card p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-dmp-white/70">Sign in to start earning XP and ranking up.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      )}

      <h2 className="font-display font-bold text-xl mb-4">How to earn XP</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-10">
        {actions.map((a) => (
          <div key={a.action} className="card p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{a.label}</p>
              {a.daily_cap && <p className="text-xs text-dmp-white/40">Up to {a.daily_cap} per day</p>}
              {a.mode === 'one_time' && <p className="text-xs text-dmp-white/40">One time</p>}
            </div>
            <span className="badge bg-dmp-green text-black shrink-0">+{a.xp} XP</span>
          </div>
        ))}
        <div className="card p-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Buy anything in the shop</p>
          <span className="badge bg-dmp-green text-black shrink-0">+1 XP per $1</span>
        </div>
      </div>

      <h2 className="font-display font-bold text-xl mb-4">All ranks</h2>
      <div className="flex flex-col gap-2 mb-10">
        {ranks.map((r) => (
          <div
            key={r.id}
            className={`card p-3 flex items-center justify-between ${current?.id === r.id ? 'border-dmp-yellow' : ''}`}
          >
            <p className="text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-dmp-white/50">{r.min_xp} XP</p>
          </div>
        ))}
      </div>

      {user && events.length > 0 && (
        <>
          <h2 className="font-display font-bold text-xl mb-4">Recent activity</h2>
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="card p-3 flex items-center justify-between text-sm">
                <span>{names[e.action] || e.action}</span>
                <span className="text-dmp-green font-semibold">+{e.xp} XP</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLES = ['listener', 'buyer', 'admin']

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function changeRole(u, role) {
    if (u.id === currentUser?.id && role !== 'admin') {
      setStatus("Error: you can't remove your own admin access here — have another admin do it.")
      return
    }
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id)
    if (error) setStatus(`Error: ${error.message}`)
    else { setStatus(''); load() }
  }

  async function toggleBan(u) {
    if (u.id === currentUser?.id) {
      setStatus("Error: you can't ban your own account.")
      return
    }
    const { error } = await supabase.from('profiles').update({ is_banned: !u.is_banned }).eq('id', u.id)
    if (error) setStatus(`Error: ${error.message}`)
    else { setStatus(''); load() }
  }

  const filtered = users.filter((u) =>
    (u.email || '').toLowerCase().includes(q.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-2">Users</h1>
      <p className="text-dmp-white/50 text-sm mb-6 max-w-xl">
        Manage every listener and buyer account. Change roles, or ban an account to block them
        from streaming and buying (banned users are signed out automatically). Note: this
        controls in-app access via <code>profiles</code>; to fully delete an account's login you
        still need the Supabase dashboard (Auth → Users).
      </p>

      <input
        className="input max-w-xs mb-4"
        placeholder="Search by name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {status && <p className="text-dmp-red text-sm mb-4">{status}</p>}

      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-dmp-white/50">No users found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <div key={u.id} className="card p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {u.display_name || 'Unnamed'} {u.id === currentUser?.id && <span className="text-dmp-white/40">(you)</span>}
                </p>
                <p className="text-xs text-dmp-white/50 truncate">{u.email}</p>
                <p className="text-xs text-dmp-white/30">{u.points_balance} pts · joined {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {u.is_banned && <span className="badge bg-dmp-red text-white">Banned</span>}
                <select
                  className="input !py-1 !w-auto text-xs"
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  onClick={() => toggleBan(u)}
                  className={u.is_banned ? 'btn-outline !py-1 !px-3 text-xs' : 'btn-danger !py-1 !px-3 text-xs'}
                >
                  {u.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

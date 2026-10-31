import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminRewards() {
  const [actions, setActions] = useState([])
  const [ranks, setRanks] = useState([])
  const [status, setStatus] = useState('')

  async function load() {
    const [{ data: a }, { data: r }] = await Promise.all([
      supabase.from('xp_actions').select('*').order('sort_order'),
      supabase.from('ranks').select('*').order('min_xp'),
    ])
    setActions(a || [])
    setRanks(r || [])
  }

  useEffect(() => { load() }, [])

  const editAction = (key, field, val) =>
    setActions((list) => list.map((x) => (x.action === key ? { ...x, [field]: val } : x)))
  const editRank = (id, field, val) =>
    setRanks((list) => list.map((x) => (x.id === id ? { ...x, [field]: val } : x)))

  async function saveAction(a) {
    const { error } = await supabase
      .from('xp_actions')
      .update({
        xp: Number(a.xp) || 0,
        daily_cap: a.daily_cap === '' || a.daily_cap == null ? null : Number(a.daily_cap),
        is_active: a.is_active,
      })
      .eq('action', a.action)
    setStatus(error ? `Error: ${error.message}` : `Saved: ${a.label}`)
  }

  async function saveRank(r) {
    const { error } = await supabase
      .from('ranks')
      .update({ name: r.name, min_xp: Number(r.min_xp) || 0 })
      .eq('id', r.id)
    setStatus(error ? `Error: ${error.message}` : `Saved: ${r.name}`)
    load()
  }

  async function deleteRank(r) {
    if (!confirm(`Delete the "${r.name}" rank?`)) return
    const { error } = await supabase.from('ranks').delete().eq('id', r.id)
    setStatus(error ? `Error: ${error.message}` : 'Rank deleted')
    load()
  }

  async function addRank(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const { error } = await supabase
      .from('ranks')
      .insert({ name: f.get('name').trim(), min_xp: Number(f.get('min_xp')) })
    if (error) setStatus(`Error: ${error.message}`)
    else {
      setStatus('Rank added')
      e.target.reset()
      load()
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-extrabold text-2xl mb-2">Ranks & XP</h1>
      <p className="text-dmp-white/50 text-sm mb-6">
        Change how much XP each action gives, set daily limits, and edit the rank ladder. Changes apply right away.
        Purchases give 1 XP per $1 spent.
      </p>
      {status && <p className={`text-sm mb-4 ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}

      <h2 className="font-display font-bold text-xl mb-3">XP actions</h2>
      <div className="flex flex-col gap-2 mb-10">
        {actions.map((a) => (
          <div key={a.action} className="card p-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-semibold">{a.label}</p>
              <p className="text-xs text-dmp-white/40">{a.mode.replace(/_/g, ' ')}</p>
            </div>
            <label className="text-xs text-dmp-white/50">
              XP
              <input className="input !py-1 w-20 ml-1" type="number" min="0" value={a.xp} onChange={(e) => editAction(a.action, 'xp', e.target.value)} />
            </label>
            <label className="text-xs text-dmp-white/50">
              Daily cap
              <input className="input !py-1 w-20 ml-1" type="number" min="1" value={a.daily_cap ?? ''} placeholder="none" onChange={(e) => editAction(a.action, 'daily_cap', e.target.value)} />
            </label>
            <label className="text-xs text-dmp-white/50 flex items-center gap-1">
              <input type="checkbox" checked={!!a.is_active} onChange={(e) => editAction(a.action, 'is_active', e.target.checked)} />
              On
            </label>
            <button onClick={() => saveAction(a)} className="btn-outline !py-1 !px-3 text-xs">Save</button>
          </div>
        ))}
      </div>

      <h2 className="font-display font-bold text-xl mb-3">Ranks</h2>
      <div className="flex flex-col gap-2 mb-6">
        {ranks.map((r) => (
          <div key={r.id} className="card p-3 flex items-center gap-3 flex-wrap">
            <input className="input !py-1 flex-1 min-w-[140px]" value={r.name} onChange={(e) => editRank(r.id, 'name', e.target.value)} />
            <label className="text-xs text-dmp-white/50">
              Starts at
              <input className="input !py-1 w-24 ml-1" type="number" min="0" value={r.min_xp} onChange={(e) => editRank(r.id, 'min_xp', e.target.value)} />
              <span className="ml-1">XP</span>
            </label>
            <button onClick={() => saveRank(r)} className="btn-outline !py-1 !px-3 text-xs">Save</button>
            <button onClick={() => deleteRank(r)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
          </div>
        ))}
      </div>

      <form onSubmit={addRank} className="card p-4 flex gap-3 flex-wrap items-end">
        <input className="input flex-1 min-w-[140px]" name="name" placeholder="New rank name" required />
        <input className="input w-28" name="min_xp" type="number" min="0" placeholder="XP needed" required />
        <button className="btn-primary">Add rank</button>
      </form>
    </div>
  )
}
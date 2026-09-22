import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminRewards() {
  const [catalog, setCatalog] = useState([])
  const [status, setStatus] = useState('')

  async function load() {
    const { data } = await supabase.from('rewards_catalog').select('*').order('cost_points')
    setCatalog(data || [])
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const { error } = await supabase.from('rewards_catalog').insert({
      title: f.get('title'),
      description: f.get('description'),
      cost_points: Number(f.get('cost_points')),
      reward_type: f.get('reward_type'),
      discount_percent: f.get('reward_type') === 'discount_code' ? Number(f.get('discount_percent') || 0) : null,
    })
    if (error) setStatus(`Error: ${error.message}`)
    else {
      setStatus('Reward added ✓')
      e.target.reset()
      load()
    }
  }

  async function toggleActive(r) {
    await supabase.from('rewards_catalog').update({ is_active: !r.is_active }).eq('id', r.id)
    load()
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Rewards Program</h1>

      <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3 max-w-md mb-8">
        <h2 className="font-display font-semibold">Add Reward</h2>
        <input className="input" name="title" placeholder="Title (e.g. Free Basic License)" required />
        <textarea className="input" name="description" placeholder="Description" rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" name="cost_points" type="number" placeholder="Cost (points)" required />
          <select className="input" name="reward_type" defaultValue="free_track_license">
            <option value="free_track_license">Free Track License</option>
            <option value="free_product">Free Product</option>
            <option value="discount_code">Discount Code</option>
          </select>
        </div>
        <input className="input" name="discount_percent" type="number" placeholder="Discount % (if applicable)" />
        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}
        <button className="btn-primary">Add to Catalog</button>
      </form>

      <h2 className="font-display font-bold text-xl mb-4">Current Catalog</h2>
      <div className="flex flex-col gap-2">
        {catalog.map((r) => (
          <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-dmp-white/50">{r.cost_points} pts · {r.reward_type.replace('_', ' ')}</p>
            </div>
            <button onClick={() => toggleActive(r)} className="btn-outline !py-1 !px-3 text-xs">
              {r.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

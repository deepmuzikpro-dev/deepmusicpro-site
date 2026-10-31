import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function AdminRewards() {
  const [catalog, setCatalog] = useState([])
  const [tracks, setTracks] = useState([])
  const [products, setProducts] = useState([])
  const [type, setType] = useState('free_track_license')
  const [status, setStatus] = useState('')

  async function load() {
    const [{ data: c }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('rewards_catalog').select('*').order('cost_points'),
      supabase.from('tracks').select('id, title').order('title'),
      supabase.from('products').select('id, title').order('title'),
    ])
    setCatalog(c || [])
    setTracks(t || [])
    setProducts(p || [])
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const rt = f.get('reward_type')
    const { error } = await supabase.from('rewards_catalog').insert({
      title: f.get('title'),
      description: f.get('description'),
      cost_points: Number(f.get('cost_points')),
      reward_type: rt,
      linked_track_id: rt === 'free_track_license' ? f.get('linked_track_id') || null : null,
      linked_product_id: rt === 'free_product' ? f.get('linked_product_id') || null : null,
      discount_percent: rt === 'discount_code' ? Number(f.get('discount_percent') || 0) : null,
    })
    if (error) setStatus(`Error: ${error.message}`)
    else {
      setStatus('Reward added')
      e.target.reset()
      setType('free_track_license')
      load()
    }
  }

  function linkedName(r) {
    if (r.linked_track_id) return tracks.find((t) => t.id === r.linked_track_id)?.title
    if (r.linked_product_id) return products.find((p) => p.id === r.linked_product_id)?.title
    if (r.discount_percent) return `${r.discount_percent}% off`
    return null
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Rewards Program</h1>

      <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3 max-w-md mb-8">
        <h2 className="font-display font-semibold">Add Reward</h2>
        <input className="input" name="title" placeholder="Title (e.g. Free Basic License)" required />
        <textarea className="input" name="description" placeholder="Description" rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" name="cost_points" type="number" min="1" placeholder="Cost (points)" required />
          <select className="input" name="reward_type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="free_track_license">Free Track License</option>
            <option value="free_product">Free Product</option>
            <option value="discount_code">Discount Code</option>
          </select>
        </div>
        {type === 'free_track_license' && (
          <select className="input" name="linked_track_id" defaultValue="">
            <option value="">Any track (not chosen)</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
        {type === 'free_product' && (
          <select className="input" name="linked_product_id" defaultValue="">
            <option value="">Choose a product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
        {type === 'discount_code' && (
          <input className="input" name="discount_percent" type="number" min="1" max="100" placeholder="Discount %" />
        )}
        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}
        <button className="btn-primary">Add to Catalog</button>
      </form>

      <h2 className="font-display font-bold text-xl mb-4">Current Catalog</h2>
      <div className="flex flex-col gap-2 max-w-2xl">
        {catalog.length === 0 && <p className="text-dmp-white/50 text-sm">No rewards yet.</p>}
        {catalog.map((r) => (
          <Link key={r.id} to={`/admin/rewards/${r.id}`} className="card p-3 flex items-center justify-between gap-3 hover:border-dmp-green/60 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{r.title}</p>
              <p className="text-xs text-dmp-white/50 truncate">
                {r.cost_points} pts - {r.reward_type.replace(/_/g, ' ')}
                {linkedName(r) ? ` - ${linkedName(r)}` : ''}
              </p>
            </div>
            <span className={`badge shrink-0 ${r.is_active ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/50'}`}>
              {r.is_active ? 'Active' : 'Hidden'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
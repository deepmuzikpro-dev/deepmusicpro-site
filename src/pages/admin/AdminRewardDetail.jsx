import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function AdminRewardDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [tracks, setTracks] = useState([])
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: r }, { data: t }, { data: p }] = await Promise.all([
        supabase.from('rewards_catalog').select('*').eq('id', id).maybeSingle(),
        supabase.from('tracks').select('id, title').order('title'),
        supabase.from('products').select('id, title').order('title'),
      ])
      setForm(r || null)
      setTracks(t || [])
      setProducts(p || [])
      setLoaded(true)
    }
    load()
  }, [id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  if (!loaded) return <p className="text-dmp-white/50">Loading...</p>
  if (!form) return <p className="text-dmp-white/50">Reward not found.</p>

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const rt = form.reward_type
    const { error } = await supabase
      .from('rewards_catalog')
      .update({
        title: form.title,
        description: form.description,
        cost_points: Number(form.cost_points),
        reward_type: rt,
        linked_track_id: rt === 'free_track_license' ? form.linked_track_id || null : null,
        linked_product_id: rt === 'free_product' ? form.linked_product_id || null : null,
        discount_percent: rt === 'discount_code' ? Number(form.discount_percent) || null : null,
        is_active: form.is_active,
      })
      .eq('id', id)
    setBusy(false)
    setStatus(error ? `Error: ${error.message}` : 'Saved')
  }

  async function handleDelete() {
    if (!confirm(`Delete "${form.title}"?`)) return
    const { error } = await supabase.from('rewards_catalog').delete().eq('id', id)
    if (error) setStatus(`Error: ${error.message}`)
    else navigate('/admin/rewards')
  }

  return (
    <div className="max-w-lg">
      <Link to="/admin/rewards" className="text-dmp-white/50 text-sm hover:underline">&larr; All rewards</Link>
      <h1 className="font-display font-extrabold text-2xl mt-2 mb-6">Edit reward</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="text-xs text-dmp-white/50">Title</label>
        <input className="input" value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />

        <label className="text-xs text-dmp-white/50">Description</label>
        <textarea className="input" rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-dmp-white/50">Cost (points)</label>
            <input className="input" type="number" min="1" value={form.cost_points ?? ''} onChange={(e) => set('cost_points', e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-dmp-white/50">Type</label>
            <select className="input" value={form.reward_type} onChange={(e) => set('reward_type', e.target.value)}>
              <option value="free_track_license">Free Track License</option>
              <option value="free_product">Free Product</option>
              <option value="discount_code">Discount Code</option>
            </select>
          </div>
        </div>

        {form.reward_type === 'free_track_license' && (
          <>
            <label className="text-xs text-dmp-white/50">Track given away</label>
            <select className="input" value={form.linked_track_id || ''} onChange={(e) => set('linked_track_id', e.target.value)}>
              <option value="">Not chosen</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </>
        )}
        {form.reward_type === 'free_product' && (
          <>
            <label className="text-xs text-dmp-white/50">Product given away</label>
            <select className="input" value={form.linked_product_id || ''} onChange={(e) => set('linked_product_id', e.target.value)}>
              <option value="">Not chosen</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </>
        )}
        {form.reward_type === 'discount_code' && (
          <>
            <label className="text-xs text-dmp-white/50">Discount %</label>
            <input className="input" type="number" min="1" max="100" value={form.discount_percent ?? ''} onChange={(e) => set('discount_percent', e.target.value)} />
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          Active (visible on the Rewards page)
        </label>

        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}

        <div className="flex gap-3 mt-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
          <button type="button" onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </form>
    </div>
  )
}
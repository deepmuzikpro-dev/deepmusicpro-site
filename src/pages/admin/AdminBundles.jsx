import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminBundles() {
  const [bundles, setBundles] = useState([])
  const [tracks, setTracks] = useState([])
  const [products, setProducts] = useState([])
  const [selectedTracks, setSelectedTracks] = useState([]) // [{trackId, license}]
  const [selectedProducts, setSelectedProducts] = useState([]) // [productId]
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('bundles').select('*, bundle_items(*, tracks(title), products(title))').order('created_at', { ascending: false }),
      supabase.from('tracks').select('id, title').eq('is_published', true).order('title'),
      supabase.from('products').select('id, title').eq('is_published', true).order('title'),
    ])
    setBundles(b || [])
    setTracks(t || [])
    setProducts(p || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggleTrack(trackId) {
    setSelectedTracks((prev) =>
      prev.some((x) => x.trackId === trackId)
        ? prev.filter((x) => x.trackId !== trackId)
        : [...prev, { trackId, license: 'basic' }]
    )
  }
  function setTrackLicense(trackId, license) {
    setSelectedTracks((prev) => prev.map((x) => (x.trackId === trackId ? { ...x, license } : x)))
  }
  function toggleProduct(productId) {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((x) => x !== productId) : [...prev, productId]
    )
  }

  async function handleCreate(e) {
    e.preventDefault()
    setStatus('')
    const f = new FormData(e.target)
    if (selectedTracks.length === 0 && selectedProducts.length === 0) {
      setStatus('Error: pick at least one track or product for the bundle.')
      return
    }
    const { data: bundle, error } = await supabase
      .from('bundles')
      .insert({ title: f.get('title'), description: f.get('description'), price: Number(f.get('price')) })
      .select()
      .single()
    if (error) { setStatus(`Error: ${error.message}`); return }

    const items = [
      ...selectedTracks.map((t) => ({ bundle_id: bundle.id, item_type: 'track_license', track_id: t.trackId, license: t.license })),
      ...selectedProducts.map((pid) => ({ bundle_id: bundle.id, item_type: 'product', product_id: pid })),
    ]
    const { error: itemsErr } = await supabase.from('bundle_items').insert(items)
    if (itemsErr) { setStatus(`Error: ${itemsErr.message}`); return }

    setStatus('Bundle created ✓')
    e.target.reset()
    setSelectedTracks([])
    setSelectedProducts([])
    load()
  }

  async function togglePublish(b) {
    await supabase.from('bundles').update({ is_published: !b.is_published }).eq('id', b.id)
    load()
  }
  async function remove(b) {
    if (!confirm(`Delete bundle "${b.title}"?`)) return
    await supabase.from('bundles').delete().eq('id', b.id)
    load()
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Bundles</h1>

      <form onSubmit={handleCreate} className="card p-5 flex flex-col gap-3 max-w-xl mb-10">
        <h2 className="font-display font-semibold">Create Bundle</h2>
        <input className="input" name="title" placeholder="Bundle title (e.g. Drill Starter Pack)" required />
        <textarea className="input" name="description" placeholder="Description" rows={2} />
        <input className="input" name="price" type="number" step="0.01" placeholder="Bundle price $ (usually less than sum of parts)" required />

        <div>
          <p className="text-xs text-dmp-white/50 mb-2">Include tracks (basic license unless changed):</p>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {tracks.map((t) => {
              const sel = selectedTracks.find((x) => x.trackId === t.id)
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm flex-1">
                    <input type="checkbox" checked={!!sel} onChange={() => toggleTrack(t.id)} />
                    {t.title}
                  </label>
                  {sel && (
                    <select
                      className="input !py-0.5 !w-28 text-xs"
                      value={sel.license}
                      onChange={(e) => setTrackLicense(t.id, e.target.value)}
                    >
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-xs text-dmp-white/50 mb-2">Include products:</p>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                {p.title}
              </label>
            ))}
          </div>
        </div>

        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}
        <button className="btn-primary">Create Bundle</button>
      </form>

      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bundles.map((b) => (
            <div key={b.id} className="card p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{b.title} — ${Number(b.price).toFixed(2)}</p>
                <p className="text-xs text-dmp-white/50">{b.bundle_items?.length || 0} items</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${b.is_published ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/50'}`}>
                  {b.is_published ? 'Published' : 'Hidden'}
                </span>
                <button onClick={() => togglePublish(b)} className="btn-outline !py-1 !px-3 text-xs">
                  {b.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => remove(b)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

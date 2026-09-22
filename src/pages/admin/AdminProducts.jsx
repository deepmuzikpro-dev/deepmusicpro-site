import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function togglePublish(p) {
    await supabase.from('products').update({ is_published: !p.is_published }).eq('id', p.id)
    load()
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    await supabase.from('products').delete().eq('id', p.id)
    load()
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Manage Products</h1>
      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-dmp-white/50">No products yet — upload one to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <div key={p.id} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={p.cover_url || '/favicon.svg'} alt="" className="w-10 h-10 rounded object-cover border border-white/10 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.title}</p>
                  <p className="text-xs text-dmp-white/50 truncate capitalize">{p.category.replace('_', ' ')} · ${Number(p.price).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${p.is_published ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/50'}`}>
                  {p.is_published ? 'Published' : 'Hidden'}
                </span>
                <button onClick={() => togglePublish(p)} className="btn-outline !py-1 !px-3 text-xs">
                  {p.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => remove(p)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

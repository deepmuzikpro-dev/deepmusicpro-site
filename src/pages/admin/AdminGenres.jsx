import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function AdminGenres() {
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('genres').select('*').order('sort_order')
    setGenres(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setStatus('')
    const f = new FormData(e.target)
    const name = f.get('name').trim()
    if (!name) return
    const slug = slugify(name)
    const nextOrder = genres.length ? Math.max(...genres.map((g) => g.sort_order)) + 1 : 1
    const { error } = await supabase.from('genres').insert({ name, slug, sort_order: nextOrder })
    if (error) setStatus(`Error: ${error.message}`)
    else {
      setStatus('Genre added ✓')
      e.target.reset()
      load()
    }
  }

  async function toggleActive(g) {
    await supabase.from('genres').update({ is_active: !g.is_active }).eq('id', g.id)
    load()
  }

  function startEdit(g) {
    setEditingId(g.id)
    setEditName(g.name)
  }

  async function saveEdit(g) {
    const name = editName.trim()
    if (!name) return
    await supabase.from('genres').update({ name }).eq('id', g.id)
    setEditingId(null)
    load()
  }

  async function remove(g) {
    if (!confirm(`Delete "${g.name}"? Tracks using it will block this if any still reference it.`)) return
    const { error } = await supabase.from('genres').delete().eq('id', g.id)
    if (error) {
      setStatus(`Error: can't delete "${g.name}" — some tracks still use it. Reassign or delete those tracks first, or just deactivate it instead.`)
    } else {
      setStatus('Genre deleted ✓')
    }
    load()
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Genres & Tags</h1>
      <p className="text-dmp-white/50 text-sm mb-6 max-w-xl">
        These power the genre filter on the Stream Beats page and the genre dropdown when
        uploading a track. Deactivate a genre to hide it from the site without deleting it (safe
        if tracks still use it); delete only removes genres no track references.
      </p>

      <form onSubmit={handleAdd} className="card p-4 flex flex-col gap-3 max-w-md mb-8">
        <h2 className="font-display font-semibold">Add Genre</h2>
        <input className="input" name="name" placeholder="e.g. Boom Bap, R&B, Afrobeat" required />
        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}
        <button className="btn-primary">Add Genre</button>
      </form>

      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2 max-w-lg">
          {genres.map((g) => (
            <div key={g.id} className="card p-3 flex items-center justify-between gap-3">
              {editingId === g.id ? (
                <input
                  className="input !py-1 flex-1 mr-3"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                <div>
                  <p className="text-sm font-semibold">{g.name}</p>
                  <p className="text-xs text-dmp-white/40">slug: {g.slug}</p>
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${g.is_active ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/50'}`}>
                  {g.is_active ? 'Active' : 'Hidden'}
                </span>
                {editingId === g.id ? (
                  <button onClick={() => saveEdit(g)} className="btn-outline !py-1 !px-3 text-xs">Save</button>
                ) : (
                  <button onClick={() => startEdit(g)} className="btn-outline !py-1 !px-3 text-xs">Rename</button>
                )}
                <button onClick={() => toggleActive(g)} className="btn-outline !py-1 !px-3 text-xs">
                  {g.is_active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => remove(g)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

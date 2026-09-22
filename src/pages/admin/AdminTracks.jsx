import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminTracks() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false })
    setTracks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function togglePublish(track) {
    await supabase.from('tracks').update({ is_published: !track.is_published }).eq('id', track.id)
    load()
  }

  async function remove(track) {
    if (!confirm(`Delete "${track.title}"? This cannot be undone.`)) return
    await supabase.from('tracks').delete().eq('id', track.id)
    load()
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Manage Tracks</h1>
      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : tracks.length === 0 ? (
        <p className="text-dmp-white/50">No tracks yet — upload one to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tracks.map((t) => (
            <div key={t.id} className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={t.cover_url || '/favicon.svg'} alt="" className="w-10 h-10 rounded object-cover border border-white/10 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t.title}</p>
                  <p className="text-xs text-dmp-white/50 truncate capitalize">{t.genre?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${t.is_published ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/50'}`}>
                  {t.is_published ? 'Published' : 'Hidden'}
                </span>
                <button onClick={() => togglePublish(t)} className="btn-outline !py-1 !px-3 text-xs">
                  {t.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => remove(t)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

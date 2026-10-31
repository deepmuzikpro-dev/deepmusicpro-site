import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminFeedback() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('open')
  const [replies, setReplies] = useState({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('suggestions')
      .select('*, profiles(display_name, email)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function sendReply(s) {
    const text = (replies[s.id] ?? s.admin_reply ?? '').trim()
    if (!text) return
    setStatus('')
    const { error } = await supabase
      .from('suggestions')
      .update({ admin_reply: text, status: 'answered', replied_at: new Date().toISOString() })
      .eq('id', s.id)
    if (error) setStatus(`Error: ${error.message}`)
    else {
      setReplies((r) => ({ ...r, [s.id]: undefined }))
      load()
    }
  }

  async function remove(s) {
    if (!confirm('Delete this message?')) return
    await supabase.from('suggestions').delete().eq('id', s.id)
    load()
  }

  const shown = items.filter((s) => filter === 'all' || s.status === filter)
  const openCount = items.filter((s) => s.status === 'open').length

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-4">
        Feedback {openCount > 0 && <span className="badge bg-dmp-red text-white ml-2">{openCount} open</span>}
      </h1>

      <div className="flex gap-2 mb-6">
        {['open', 'answered', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`badge px-3 py-1.5 capitalize ${filter === f ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {status && <p className="text-dmp-red text-sm mb-3">{status}</p>}

      {loading ? (
        <p className="text-dmp-white/50">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-dmp-white/50">Nothing here.</p>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {shown.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-semibold">
                  {s.profiles?.display_name || 'User'}{' '}
                  <span className="text-dmp-white/40 font-normal">{s.profiles?.email}</span>
                </p>
                <span className="badge bg-white/10 text-dmp-white/70 capitalize">{s.kind}</span>
              </div>
              <p className="text-sm whitespace-pre-line mb-3">{s.message}</p>
              <textarea
                className="input"
                rows={2}
                placeholder="Write a reply..."
                value={replies[s.id] ?? s.admin_reply ?? ''}
                onChange={(e) => setReplies((r) => ({ ...r, [s.id]: e.target.value }))}
              />
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => sendReply(s)} className="btn-primary !py-1.5 !px-4 text-sm">
                  {s.status === 'answered' ? 'Update reply' : 'Send reply'}
                </button>
                <button onClick={() => remove(s)} className="btn-danger !py-1 !px-3 text-xs">Delete</button>
                <span className="text-xs text-dmp-white/40 ml-auto">{new Date(s.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
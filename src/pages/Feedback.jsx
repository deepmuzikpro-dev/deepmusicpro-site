import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

const KINDS = [
  { value: 'question', label: 'Question' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'bug', label: 'Something is broken' },
]

export default function Feedback() {
  const { user, loading } = useAuth()
  const [items, setItems] = useState([])
  const [kind, setKind] = useState('question')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function load() {
    if (!user) return
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setBusy(true)
    setStatus('')
    const { error } = await supabase
      .from('suggestions')
      .insert({ user_id: user.id, kind, message: message.trim() })
    setBusy(false)
    if (error) {
      setStatus(`Error: ${error.message}`)
    } else {
      setMessage('')
      setStatus('Sent! We will reply here.')
      load()
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-2">Ask us anything</h1>
      <p className="text-dmp-white/60 mb-6">
        Have a question, an idea, or found something broken? Send it here and we will reply on this page.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-10">
        <select className="input sm:max-w-[240px]" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <textarea
          className="input"
          rows={4}
          maxLength={1000}
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}
        <button className="btn-primary self-start" disabled={busy || !message.trim()}>
          {busy ? 'Sending...' : 'Send'}
        </button>
      </form>

      <h2 className="font-display font-bold text-xl mb-3">Your messages</h2>
      {items.length === 0 ? (
        <p className="text-dmp-white/50 text-sm">You have not sent anything yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="badge bg-white/10 text-dmp-white/70 capitalize">{s.kind}</span>
                <span className={`badge ${s.status === 'answered' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/50'}`}>
                  {s.status === 'answered' ? 'Answered' : 'Waiting'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-line">{s.message}</p>
              {s.admin_reply && (
                <div className="mt-3 pl-3 border-l-2 border-dmp-green">
                  <p className="text-xs text-dmp-green font-semibold mb-1">Reply from Deepmusicpro</p>
                  <p className="text-sm text-dmp-white/80 whitespace-pre-line">{s.admin_reply}</p>
                </div>
              )}
              <p className="text-xs text-dmp-white/40 mt-2">{new Date(s.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
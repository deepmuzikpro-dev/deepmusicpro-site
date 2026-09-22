import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

export default function CommentSection({ trackId }) {
  const { user, profile, isAdmin } = useAuth()
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('track_comments')
      .select('*, profiles(display_name)')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false })
    setComments(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [trackId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    setError('')
    const { error } = await supabase.from('track_comments').insert({
      track_id: trackId,
      user_id: user.id,
      body: body.trim(),
    })
    setPosting(false)
    if (error) setError(error.message)
    else {
      setBody('')
      load()
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('Delete this comment?')) return
    await supabase.from('track_comments').delete().eq('id', commentId)
    load()
  }

  return (
    <div className="mt-14">
      <h2 className="font-display font-bold text-xl mb-4">
        Comments {comments.length > 0 && <span className="text-dmp-white/40 font-normal text-base">({comments.length})</span>}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6">
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            placeholder={`Comment as ${profile?.display_name || 'you'}…`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-dmp-red text-sm">{error}</p>}
          <button className="btn-primary self-start !py-1.5 !px-4 text-sm" disabled={posting || !body.trim()}>
            {posting ? 'Posting…' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <p className="text-dmp-white/50 text-sm mb-6">
          <Link to="/login" className="text-dmp-green hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}

      {loading ? (
        <p className="text-dmp-white/50 text-sm">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-dmp-white/50 text-sm">No comments yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="card p-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-semibold">{c.profiles?.display_name || 'Deepmusicpro user'}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-dmp-white/40">{new Date(c.created_at).toLocaleDateString()}</span>
                  {(user?.id === c.user_id || isAdmin) && (
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-dmp-red/80 hover:text-dmp-red">
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-dmp-white/80 whitespace-pre-line">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

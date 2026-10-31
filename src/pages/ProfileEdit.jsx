import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase, BUCKETS } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProfileEdit() {
  const { user, profile, loading } = useAuth()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const f = new FormData(e.target)
    try {
      const update = {
        display_name: (f.get('display_name') || '').trim(),
        bio: (f.get('bio') || '').trim(),
      }
      const file = f.get('avatar')
      if (file && file.size) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
        const path = `avatars/${user.id}/${Date.now()}-${safe}`
        const { error: upErr } = await supabase.storage.from(BUCKETS.ARTWORK).upload(path, file)
        if (upErr) throw upErr
        update.avatar_url = supabase.storage.from(BUCKETS.ARTWORK).getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
      if (error) throw error
      window.location.assign(`/u/${user.id}`)
    } catch (err) {
      setStatus(`Error: ${err.message}`)
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <Link to={`/u/${user.id}`} className="text-dmp-white/50 text-sm hover:underline">&larr; My profile</Link>
      <h1 className="font-display font-extrabold text-2xl mt-2 mb-6">Edit profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs text-dmp-white/50">Display name</label>
        <input className="input" name="display_name" defaultValue={profile?.display_name || ''} required />
        <label className="text-xs text-dmp-white/50">Bio</label>
        <textarea className="input" name="bio" rows={5} maxLength={500} defaultValue={profile?.bio || ''} placeholder="Tell people about your music and what you sell" />
        <label className="text-xs text-dmp-white/50">Profile photo</label>
        <input className="input" name="avatar" type="file" accept="image/*" />
        {status && <p className="text-sm text-dmp-red">{status}</p>}
        <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
      </form>
    </div>
  )
}
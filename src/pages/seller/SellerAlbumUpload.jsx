import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase, BUCKETS } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

async function uploadFile(bucket, file, prefix) {
  if (!file || !file.size) return null
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const path = `${prefix}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

const publicUrl = (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

const emptyTrack = () => ({ key: Math.random().toString(36).slice(2), title: '', preview: null, mp3: null, wav: null })

export default function SellerAlbumUpload() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tracks, setTracks] = useState([emptyTrack()])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const updateTrack = (key, field, val) =>
    setTracks((list) => list.map((t) => (t.key === key ? { ...t, [field]: val } : t)))
  const removeTrack = (key) =>
    setTracks((list) => (list.length > 1 ? list.filter((t) => t.key !== key) : list))

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const f = new FormData(e.target)
    let albumId = null
    try {
      if (tracks.some((t) => !t.title.trim() || !t.preview)) {
        throw new Error('Every track needs a title and a streaming file.')
      }
      const coverPath = await uploadFile(BUCKETS.ARTWORK, f.get('cover'), 'albums')
      const { data: album, error } = await supabase
        .from('albums')
        .insert({
          seller_id: user.id,
          title: f.get('title').trim(),
          description: f.get('description'),
          price: Number(f.get('price')),
          cover_url: coverPath ? publicUrl(BUCKETS.ARTWORK, coverPath) : null,
          is_published: false,
        })
        .select('id')
        .single()
      if (error) throw error
      albumId = album.id

      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i]
        setStatus(`Uploading track ${i + 1} of ${tracks.length}...`)
        const previewPath = await uploadFile(BUCKETS.AUDIO_PREVIEWS, t.preview, `albums/${albumId}`)
        const mp3Path = await uploadFile(BUCKETS.AUDIO_MASTERS, t.mp3, `albums/${albumId}/mp3`)
        const wavPath = await uploadFile(BUCKETS.AUDIO_MASTERS, t.wav, `albums/${albumId}/wav`)
        const { error: tErr } = await supabase.from('album_tracks').insert({
          album_id: albumId,
          track_number: i + 1,
          title: t.title.trim(),
          preview_url: publicUrl(BUCKETS.AUDIO_PREVIEWS, previewPath),
          master_mp3_path: mp3Path,
          master_wav_path: wavPath,
        })
        if (tErr) throw tErr
      }

      const { error: pErr } = await supabase.from('albums').update({ is_published: true }).eq('id', albumId)
      if (pErr) throw pErr
      navigate(`/album/${albumId}`)
    } catch (err) {
      setStatus(`Error: ${err.message}${albumId ? ' Your album was saved as a hidden draft under My albums.' : ''}`)
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/sell" className="text-dmp-white/50 text-sm hover:underline">&larr; My store</Link>
      <h1 className="font-display font-extrabold text-2xl mt-2 mb-6">List an album</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="input" name="title" placeholder="Album title" required />
        <textarea className="input" name="description" placeholder="Album details: story, credits, genre..." rows={4} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-dmp-white/50">Album price ($)</label>
            <input className="input" name="price" type="number" step="0.01" min="0.99" placeholder="9.99" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-dmp-white/50">Cover image</label>
            <input className="input" name="cover" type="file" accept="image/*" />
          </div>
        </div>

        <h2 className="font-display font-bold text-lg mt-4">Tracks</h2>
        <p className="text-xs text-dmp-white/50">
          The streaming file is public and plays for free on the album page. Upload a shortened clip if you only
          want listeners to hear a preview. The full MP3 and WAV are private and go only to people who buy the album.
        </p>

        {tracks.map((t, i) => (
          <div key={t.key} className="card p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="badge bg-white/10 text-dmp-white/70">#{i + 1}</span>
              <input className="input flex-1" placeholder="Track title" value={t.title} onChange={(e) => updateTrack(t.key, 'title', e.target.value)} />
              {tracks.length > 1 && (
                <button type="button" onClick={() => removeTrack(t.key)} className="btn-danger !py-1 !px-3 text-xs">Remove</button>
              )}
            </div>
            <label className="text-xs text-dmp-white/50">Streaming file (MP3, required)</label>
            <input className="input" type="file" accept="audio/*" onChange={(e) => updateTrack(t.key, 'preview', e.target.files[0] || null)} />
            <label className="text-xs text-dmp-white/50">Full MP3 for buyers (optional)</label>
            <input className="input" type="file" accept="audio/mpeg" onChange={(e) => updateTrack(t.key, 'mp3', e.target.files[0] || null)} />
            <label className="text-xs text-dmp-white/50">WAV for buyers (optional)</label>
            <input className="input" type="file" accept=".wav,audio/wav" onChange={(e) => updateTrack(t.key, 'wav', e.target.files[0] || null)} />
          </div>
        ))}

        <button type="button" onClick={() => setTracks((l) => [...l, emptyTrack()])} className="btn-outline self-start">
          + Add another track
        </button>

        {status && <p className={`text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}
        <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Uploading...' : 'Publish album'}</button>
      </form>
    </div>
  )
}
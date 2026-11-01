import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'

async function signed(path) {
  if (!path) return null
  const { data } = await supabase.storage.from('audio-masters').createSignedUrl(path, 3600, { download: true })
  return data?.signedUrl || null
}

export default function AlbumDownload() {
  const { id } = useParams()
  const { user, loading } = useAuth()
  const [album, setAlbum] = useState(null)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: a } = await supabase.from('albums').select('*').eq('id', id).maybeSingle()
      setAlbum(a || null)
      const { data: t } = await supabase.from('album_tracks').select('*').eq('album_id', id).order('track_number')
      const out = []
      for (const tr of t || []) {
        out.push({ ...tr, mp3: await signed(tr.master_mp3_path), wav: await signed(tr.master_wav_path) })
      }
      setRows(out)
      const hasMasters = (t || []).some((x) => x.master_mp3_path || x.master_wav_path)
      const gotLink = out.some((x) => x.mp3 || x.wav)
      if (!hasMasters) setMsg('The artist has not uploaded downloadable files for this album yet.')
      else if (!gotLink) setMsg('We could not find a paid order for this album on your account. If you just paid, wait a minute and refresh.')
      setBusy(false)
    }
    load()
  }, [user, id])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link to={`/album/${id}`} className="text-dmp-white/50 text-sm hover:underline">&larr; Back to album</Link>
      <h1 className="font-display font-extrabold text-2xl mt-2 mb-6">{album ? `${album.title} - Downloads` : 'Downloads'}</h1>

      {busy ? (
        <p className="text-dmp-white/50">Loading...</p>
      ) : msg ? (
        <p className="text-dmp-white/60">{msg}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.id} className="card p-3 flex items-center gap-3">
              <span className="text-dmp-white/40 text-sm w-6">{r.track_number}</span>
              <span className="flex-1 text-sm font-semibold truncate">{r.title}</span>
              {r.mp3 && <a href={r.mp3} className="text-dmp-green text-sm hover:underline">MP3</a>}
              {r.wav && <a href={r.wav} className="text-dmp-yellow text-sm hover:underline">WAV</a>}
            </div>
          ))}
          <p className="text-xs text-dmp-white/40 mt-2">Download links expire after an hour. Come back to this page anytime for fresh ones.</p>
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, BUCKETS } from '../../lib/supabaseClient'

const TABS = [
  { key: 'track', label: 'Beat / Track' },
  { key: 'product', label: 'eBook / PDF / Kit' },
  { key: 'bulk', label: 'Bulk Upload' },
]

function titleFromFilename(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function uploadFile(bucket, file, prefix) {
  if (!file) return null
  const path = `${prefix}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

function publicUrl(bucket, path) {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export default function AdminUpload() {
  const [tab, setTab] = useState('track')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [genres, setGenres] = useState([])

  useEffect(() => {
    supabase
      .from('genres')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setGenres(data || []))
  }, [])

  async function handleTrackSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const f = new FormData(e.target)
    try {
      const coverFile = f.get('cover')
      const previewFile = f.get('preview')
      const wavFile = f.get('wav')
      const mp3File = f.get('mp3')

      const coverPath = coverFile?.size ? await uploadFile(BUCKETS.ARTWORK, coverFile, 'covers') : null
      const previewPath = await uploadFile(BUCKETS.AUDIO_PREVIEWS, previewFile, 'previews')
      const wavPath = wavFile?.size ? await uploadFile(BUCKETS.AUDIO_MASTERS, wavFile, 'wav') : null
      const mp3Path = mp3File?.size ? await uploadFile(BUCKETS.AUDIO_MASTERS, mp3File, 'mp3') : null

      const { error } = await supabase.from('tracks').insert({
        title: f.get('title'),
        artist: f.get('artist') || 'Deepmusicpro',
        genre: f.get('genre'),
        bpm: f.get('bpm') ? Number(f.get('bpm')) : null,
        key: f.get('key') || null,
        cover_url: coverPath ? publicUrl(BUCKETS.ARTWORK, coverPath) : null,
        preview_url: publicUrl(BUCKETS.AUDIO_PREVIEWS, previewPath),
        master_wav_path: wavPath,
        master_mp3_path: mp3Path,
        price_basic: Number(f.get('price_basic')),
        price_premium: Number(f.get('price_premium')),
        price_exclusive: Number(f.get('price_exclusive')),
        tags: (f.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
      })
      if (error) throw error
      setStatus('Track uploaded ✓')
      e.target.reset()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const [bulkMode, setBulkMode] = useState('track')
  const [bulkResults, setBulkResults] = useState([])
  const [bulkBusy, setBulkBusy] = useState(false)

  async function handleBulkSubmit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const files = Array.from(e.target.querySelector('[name="bulkFiles"]').files)
    if (files.length === 0) {
      setBulkResults([{ name: '(none)', status: 'error', message: 'Choose at least one file.' }])
      return
    }
    setBulkBusy(true)
    setBulkResults(files.map((file) => ({ name: file.name, status: 'pending' })))

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const title = titleFromFilename(file.name)
      try {
        if (bulkMode === 'track') {
          const previewPath = await uploadFile(BUCKETS.AUDIO_PREVIEWS, file, 'previews')
          // Bulk upload uses the same file as both the public preview and
          // the private master — swap in a proper tagged preview and/or a
          // separate WAV master later from Manage Tracks if you want them
          // to differ (e.g. after running tools/watermark-preview.js).
          const masterPath = await uploadFile(BUCKETS.AUDIO_MASTERS, file, 'mp3')
          const { error } = await supabase.from('tracks').insert({
            title,
            artist: f.get('artist') || 'Deepmusicpro',
            genre: f.get('genre'),
            preview_url: publicUrl(BUCKETS.AUDIO_PREVIEWS, previewPath),
            master_mp3_path: masterPath,
            price_basic: Number(f.get('price_basic')),
            price_premium: Number(f.get('price_premium')),
            price_exclusive: Number(f.get('price_exclusive')),
          })
          if (error) throw error
        } else {
          const filePath = await uploadFile(BUCKETS.DOCS, file, 'products')
          const { error } = await supabase.from('products').insert({
            title,
            category: f.get('category'),
            price: Number(f.get('price')),
            file_path: filePath,
          })
          if (error) throw error
        }
        setBulkResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'done' } : r)))
      } catch (err) {
        setBulkResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'error', message: err.message } : r)))
      }
    }
    setBulkBusy(false)
  }

  async function handleProductSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const f = new FormData(e.target)
    try {
      const coverFile = f.get('cover')
      const docFile = f.get('file')

      const coverPath = coverFile?.size ? await uploadFile(BUCKETS.ARTWORK, coverFile, 'covers') : null
      const filePath = await uploadFile(BUCKETS.DOCS, docFile, 'products')

      const { error } = await supabase.from('products').insert({
        title: f.get('title'),
        description: f.get('description'),
        category: f.get('category'),
        price: Number(f.get('price')),
        cover_url: coverPath ? publicUrl(BUCKETS.ARTWORK, coverPath) : null,
        file_path: filePath,
      })
      if (error) throw error
      setStatus('Product uploaded ✓')
      e.target.reset()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl mb-6">Upload</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`badge px-3 py-1.5 ${tab === t.key ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {status && <p className={`mb-4 text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}

      {tab === 'track' ? (
        <form onSubmit={handleTrackSubmit} className="flex flex-col gap-3 max-w-lg">
          <input className="input" name="title" placeholder="Track title" required />
          <input className="input" name="artist" placeholder="Artist (default: Deepmusicpro)" />
          <div className="grid grid-cols-3 gap-3">
            <select className="input" name="genre" defaultValue={genres[0]?.slug || ''}>
              {genres.length === 0 ? (
                <option value="">No genres yet</option>
              ) : (
                genres.map((g) => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))
              )}
            </select>
            <input className="input" name="bpm" type="number" placeholder="BPM" />
            <input className="input" name="key" placeholder="Key (e.g. Cm)" />
          </div>
          {genres.length === 0 && (
            <p className="text-xs text-dmp-yellow">
              No genres set up yet — <Link to="/admin/genres" className="underline">add one first</Link>.
            </p>
          )}
          <input className="input" name="tags" placeholder="Tags, comma separated" />
          <div className="grid grid-cols-3 gap-3">
            <input className="input" name="price_basic" type="number" step="0.01" placeholder="Basic $" defaultValue={29.99} required />
            <input className="input" name="price_premium" type="number" step="0.01" placeholder="Premium $" defaultValue={59.99} required />
            <input className="input" name="price_exclusive" type="number" step="0.01" placeholder="Exclusive $" defaultValue={299.99} required />
          </div>

          <label className="text-xs text-dmp-white/50">Cover art (image)</label>
          <input className="input" name="cover" type="file" accept="image/*" />

          <label className="text-xs text-dmp-white/50">Streaming preview (mp3, public)</label>
          <input className="input" name="preview" type="file" accept="audio/*" required />

          <label className="text-xs text-dmp-white/50">Full WAV master (private download)</label>
          <input className="input" name="wav" type="file" accept="audio/wav" />

          <label className="text-xs text-dmp-white/50">Full MP3 master (private download)</label>
          <input className="input" name="mp3" type="file" accept="audio/mpeg" />

          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Uploading…' : 'Publish Track'}</button>
        </form>
      ) : (
        <form onSubmit={handleProductSubmit} className="flex flex-col gap-3 max-w-lg">
          <input className="input" name="title" placeholder="Product title" required />
          <textarea className="input" name="description" placeholder="Description" rows={4} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" name="category" defaultValue="sample_kit">
              <option value="ebook">eBook</option>
              <option value="pdf_guide">PDF Guide</option>
              <option value="sample_kit">Sample Kit</option>
              <option value="drum_kit">Drum Kit</option>
            </select>
            <input className="input" name="price" type="number" step="0.01" placeholder="Price $" required />
          </div>

          <label className="text-xs text-dmp-white/50">Cover image</label>
          <input className="input" name="cover" type="file" accept="image/*" />

          <label className="text-xs text-dmp-white/50">File (PDF, DOC, or ZIP for kits)</label>
          <input className="input" name="file" type="file" accept=".pdf,.doc,.docx,.zip" required />

          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Uploading…' : 'Publish Product'}</button>
        </form>
      )}

      {tab === 'bulk' && (
        <div className="max-w-lg">
          <p className="text-dmp-white/50 text-sm mb-4">
            Select multiple files at once — each becomes its own track or product. The title is
            taken from the filename (e.g. <code>blood-moon-drill.mp3</code> → "Blood Moon
            Drill"). Shared settings below apply to every file.
          </p>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setBulkMode('track')}
              className={`badge px-3 py-1.5 ${bulkMode === 'track' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
            >
              Tracks
            </button>
            <button
              type="button"
              onClick={() => setBulkMode('product')}
              className={`badge px-3 py-1.5 ${bulkMode === 'product' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
            >
              Products
            </button>
          </div>

          <form onSubmit={handleBulkSubmit} className="flex flex-col gap-3">
            {bulkMode === 'track' ? (
              <>
                <p className="text-xs text-dmp-yellow">
                  Note: each file is used as both the streaming preview and the sellable master —
                  swap in a separate tagged preview or WAV later from Manage Tracks if needed.
                </p>
                <input className="input" name="artist" placeholder="Artist (default: Deepmusicpro)" />
                <select className="input" name="genre" defaultValue={genres[0]?.slug || ''}>
                  {genres.length === 0 ? (
                    <option value="">No genres yet</option>
                  ) : (
                    genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)
                  )}
                </select>
                <div className="grid grid-cols-3 gap-3">
                  <input className="input" name="price_basic" type="number" step="0.01" placeholder="Basic $" defaultValue={29.99} required />
                  <input className="input" name="price_premium" type="number" step="0.01" placeholder="Premium $" defaultValue={59.99} required />
                  <input className="input" name="price_exclusive" type="number" step="0.01" placeholder="Exclusive $" defaultValue={299.99} required />
                </div>
                <label className="text-xs text-dmp-white/50">Audio files (mp3/wav) — select multiple</label>
                <input className="input" name="bulkFiles" type="file" accept="audio/*" multiple required />
              </>
            ) : (
              <>
                <select className="input" name="category" defaultValue="sample_kit">
                  <option value="ebook">eBook</option>
                  <option value="pdf_guide">PDF Guide</option>
                  <option value="sample_kit">Sample Kit</option>
                  <option value="drum_kit">Drum Kit</option>
                </select>
                <input className="input" name="price" type="number" step="0.01" placeholder="Price $ (applies to every file)" required />
                <label className="text-xs text-dmp-white/50">Files (PDF, DOC, or ZIP) — select multiple</label>
                <input className="input" name="bulkFiles" type="file" accept=".pdf,.doc,.docx,.zip" multiple required />
              </>
            )}

            <button className="btn-primary mt-2" disabled={bulkBusy}>
              {bulkBusy ? 'Uploading…' : `Upload ${bulkMode === 'track' ? 'Tracks' : 'Products'}`}
            </button>
          </form>

          {bulkResults.length > 0 && (
            <div className="flex flex-col gap-1 mt-4">
              {bulkResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs card p-2">
                  <span className="truncate">{r.name}</span>
                  <span className={
                    r.status === 'done' ? 'text-dmp-green' : r.status === 'error' ? 'text-dmp-red' : 'text-dmp-white/40'
                  }>
                    {r.status === 'pending' ? 'Uploading…' : r.status === 'done' ? 'Done ✓' : `Error: ${r.message}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

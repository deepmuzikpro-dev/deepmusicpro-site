import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase, BUCKETS } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

// Seller-facing upload — same idea as the admin uploader, but every row
// created here carries seller_id = the signed-in seller, which is what
// drives their commission split and payouts at checkout.

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

export default function SellerUpload() {
  const { user, profile, loading } = useAuth()
  const [tab, setTab] = useState('track')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [genres, setGenres] = useState([])

  useEffect(() => {
    supabase.from('genres').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setGenres(data || []))
  }, [])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const connected = !!profile?.stripe_connect_payouts_enabled

  async function handleTrackSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const f = new FormData(e.target)
    try {
      const coverFile = f.get('cover')
      const previewFile = f.get('preview')
      const mp3File = f.get('mp3')

      const coverPath = coverFile?.size ? await uploadFile(BUCKETS.ARTWORK, coverFile, 'covers') : null
      const previewPath = await uploadFile(BUCKETS.AUDIO_PREVIEWS, previewFile, 'previews')
      const mp3Path = mp3File?.size ? await uploadFile(BUCKETS.AUDIO_MASTERS, mp3File, 'mp3') : null

      const { error } = await supabase.from('tracks').insert({
        title: f.get('title'),
        artist: f.get('artist') || profile?.display_name || 'Deepmusicpro seller',
        genre: f.get('genre'),
        bpm: f.get('bpm') ? Number(f.get('bpm')) : null,
        key: f.get('key') || null,
        cover_url: coverPath ? publicUrl(BUCKETS.ARTWORK, coverPath) : null,
        preview_url: publicUrl(BUCKETS.AUDIO_PREVIEWS, previewPath),
        master_mp3_path: mp3Path,
        price_basic: Number(f.get('price_basic')),
        price_premium: Number(f.get('price_premium')),
        price_exclusive: Number(f.get('price_exclusive')),
        tags: (f.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
        seller_id: user.id,
      })
      if (error) throw error
      setStatus('Track listed ✓')
      e.target.reset()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
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
        seller_id: user.id,
      })
      if (error) throw error
      setStatus('Product listed ✓')
      e.target.reset()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <Link to="/sell" className="text-dmp-white/50 text-sm hover:underline">&larr; My store</Link>
      <h1 className="font-display font-extrabold text-2xl mt-2 mb-4">List something new</h1>

      {!connected && (
        <p className="mb-4 text-sm text-dmp-yellow">
          Heads up — you haven't finished connecting a payout account yet. You can still list
          items, but you won't get paid until you <Link to="/sell" className="underline">finish setup</Link>.
        </p>
      )}

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('track')} className={`badge px-3 py-1.5 ${tab === 'track' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}>Beat / Track</button>
        <button onClick={() => setTab('product')} className={`badge px-3 py-1.5 ${tab === 'product' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}>eBook / PDF / Kit</button>
      </div>

      {status && <p className={`mb-4 text-sm ${status.startsWith('Error') ? 'text-dmp-red' : 'text-dmp-green'}`}>{status}</p>}

      {tab === 'track' ? (
        <form onSubmit={handleTrackSubmit} className="flex flex-col gap-3">
          <input className="input" name="title" placeholder="Track title" required />
          <input className="input" name="artist" placeholder="Artist name" />
          <div className="grid grid-cols-3 gap-3">
            <select className="input" name="genre" defaultValue={genres[0]?.slug || ''}>
              {genres.length === 0 ? <option value="">No genres yet</option> : genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
            </select>
            <input className="input" name="bpm" type="number" placeholder="BPM" />
            <input className="input" name="key" placeholder="Key (e.g. Cm)" />
          </div>
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
          <label className="text-xs text-dmp-white/50">Full MP3 master (private download for buyers)</label>
          <input className="input" name="mp3" type="file" accept="audio/mpeg" />
          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Uploading…' : 'List Track'}</button>
        </form>
      ) : (
        <form onSubmit={handleProductSubmit} className="flex flex-col gap-3">
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
          <button className="btn-primary mt-2" disabled={busy}>{busy ? 'Uploading…' : 'List Product'}</button>
        </form>
      )}
    </div>
  )
}

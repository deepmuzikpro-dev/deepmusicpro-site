import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import TrackRow from '../components/TrackRow.jsx'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'trending', label: 'Trending' },
]

export default function Browse() {
  const [tracks, setTracks] = useState([])
  const [genres, setGenres] = useState([])
  const [genre, setGenre] = useState('all')
  const [q, setQ] = useState('')
  const [key, setKey] = useState('')
  const [bpmMin, setBpmMin] = useState('')
  const [bpmMax, setBpmMax] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('genres')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setGenres(data || []))
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase.from('tracks').select('*').eq('is_published', true)
      query = sort === 'trending'
        ? query.order('play_count', { ascending: false })
        : query.order('created_at', { ascending: false })
      if (genre !== 'all') query = query.eq('genre', genre)
      const { data } = await query
      setTracks(data || [])
      setLoading(false)
    }
    load()
  }, [genre, sort])

  const filtered = useMemo(() => {
    const min = bpmMin ? Number(bpmMin) : null
    const max = bpmMax ? Number(bpmMax) : null
    return tracks.filter((t) => {
      const matchesText =
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q.toLowerCase()))
      const matchesKey = !key || (t.key || '').toLowerCase().includes(key.toLowerCase())
      const matchesBpm = (min === null || (t.bpm ?? 0) >= min) && (max === null || (t.bpm ?? Infinity) <= max)
      return matchesText && matchesKey && matchesBpm
    })
  }, [tracks, q, key, bpmMin, bpmMax])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-extrabold text-3xl mb-6">Stream Beats</h1>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input sm:max-w-xs"
            placeholder="Search title or tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="input sm:max-w-[110px]"
            placeholder="Key (e.g. Cm)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <input
            className="input sm:max-w-[90px]"
            placeholder="Min BPM"
            type="number"
            value={bpmMin}
            onChange={(e) => setBpmMin(e.target.value)}
          />
          <input
            className="input sm:max-w-[90px]"
            placeholder="Max BPM"
            type="number"
            value={bpmMax}
            onChange={(e) => setBpmMax(e.target.value)}
          />
          <select className="input sm:max-w-[140px]" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setGenre('all')}
            className={`badge px-3 py-1.5 ${genre === 'all' ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenre(g.slug)}
              className={`badge px-3 py-1.5 ${genre === g.slug ? 'bg-dmp-green text-black' : 'bg-white/10 text-dmp-white/70'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-dmp-white/50">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-dmp-white/50">No tracks found.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((t, i) => (
            <TrackRow key={t.id} track={t} list={filtered} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

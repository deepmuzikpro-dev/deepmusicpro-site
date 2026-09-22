import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project URL/anon key.'
  )
}

export const supabase = createClient(url, anonKey)

// Storage bucket names used throughout the app — must match the buckets
// created in Supabase (see README).
export const BUCKETS = {
  AUDIO_PREVIEWS: 'audio-previews', // public, short streaming previews
  AUDIO_MASTERS: 'audio-masters', // private, full WAV/MP3 purchased downloads
  DOCS: 'docs', // private, PDF/DOC guides + zipped sample/drum kits
  ARTWORK: 'artwork', // public, cover art
}

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio())
  const [queue, setQueue] = useState([]) // array of track objects
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)

  const current = queue[index] || null

  useEffect(() => {
    const audio = audioRef.current
    const onTime = () => setProgress(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration || 0)
    const onEnd = () => next()
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index])

  useEffect(() => {
    audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (!current) return
    audioRef.current.src = current.preview_url
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    // Count a play the moment a (new) track starts — fire-and-forget, no UI
    // depends on the result. Powers the Trending sort and admin analytics.
    supabase.rpc('increment_play_count', { p_track_id: current.id }).then(
      () => {},
      () => {}
    )
  }, [current?.id])

  function playTrack(track, trackList = null) {
    const list = trackList || [track]
    const i = list.findIndex((t) => t.id === track.id)
    setQueue(list)
    setIndex(i >= 0 ? i : 0)
    setIsPlaying(true)
  }

  function toggle() {
    if (!current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  function next() {
    if (queue.length === 0) return
    setIndex((i) => (i + 1) % queue.length)
  }

  function prev() {
    if (queue.length === 0) return
    setIndex((i) => (i - 1 + queue.length) % queue.length)
  }

  function seek(time) {
    audioRef.current.currentTime = time
    setProgress(time)
  }

  return (
    <PlayerContext.Provider
      value={{
        current,
        queue,
        isPlaying,
        progress,
        duration,
        volume,
        setVolume,
        playTrack,
        toggle,
        next,
        prev,
        seek,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)

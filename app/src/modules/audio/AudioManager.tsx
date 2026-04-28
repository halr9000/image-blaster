import { useEffect, useRef } from 'react'
import { useAudioStore } from '../../store/audio'

const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a']
const BASE_VOLUME = 0.6

interface Props {
  slug: string
  active: boolean
}

// Fetches the world's output manifest to find audio files, plays them looping.
// Falls back gracefully if no audio exists.
export function AudioManager({ slug, active }: Props) {
  const audioRefs = useRef<HTMLAudioElement[]>([])

  useEffect(() => {
    if (!active) {
      audioRefs.current.forEach((a) => {
        a.pause()
        a.src = ''
      })
      audioRefs.current = []
      return
    }

    // Try to fetch an index of audio files from the output directory.
    // We probe a manifest.json first; if absent, we silently skip.
    fetch(`/worlds/${slug}/output/manifest.json`)
      .then((r) => (r.ok ? r.json() : { audio: [] }))
      .then((manifest: { audio?: string[] }) => {
        const files = (manifest.audio ?? []).filter((f) =>
          AUDIO_EXTENSIONS.some((ext) => f.endsWith(ext)),
        )
        const initialMuted = useAudioStore.getState().muted
        audioRefs.current = files.map((file) => {
          const audio = new Audio(`/worlds/${slug}/output/${file}`)
          audio.loop = true
          audio.volume = initialMuted ? 0 : BASE_VOLUME
          audio.play().catch(() => {/* autoplay blocked */})
          return audio
        })
      })
      .catch(() => {})

    return () => {
      audioRefs.current.forEach((a) => {
        a.pause()
        a.src = ''
      })
      audioRefs.current = []
    }
  }, [slug, active])

  useEffect(() => {
    const unsub = useAudioStore.subscribe((s) => {
      audioRefs.current.forEach((a) => {
        a.volume = s.muted ? 0 : BASE_VOLUME
      })
    })
    return unsub
  }, [])

  return null
}

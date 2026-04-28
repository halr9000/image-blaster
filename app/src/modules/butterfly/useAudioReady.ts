import { useEffect, useState } from 'react'
import * as THREE from 'three'

let ready = false
const listeners = new Set<() => void>()

function markReady() {
  if (ready) return
  ready = true
  const ctx = THREE.AudioContext.getContext()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  listeners.forEach((l) => l())
  listeners.clear()
}

if (typeof window !== 'undefined') {
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart']
  const onGesture = () => {
    markReady()
    events.forEach((e) => window.removeEventListener(e, onGesture))
  }
  events.forEach((e) => window.addEventListener(e, onGesture, { once: false }))
}

export function useAudioReady(): boolean {
  const [v, setV] = useState(ready)
  useEffect(() => {
    if (ready) {
      setV(true)
      return
    }
    const cb = () => setV(true)
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }, [])
  return v
}

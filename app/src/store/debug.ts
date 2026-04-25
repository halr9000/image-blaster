import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DebugStore {
  showColliders: boolean
  setShowColliders: (v: boolean) => void
  useButterflyController: boolean
  setUseButterflyController: (v: boolean) => void
}

export const useDebugStore = create<DebugStore>()(
  persist(
    (set) => ({
      showColliders: false,
      setShowColliders: (showColliders) => set({ showColliders }),
      useButterflyController: false,
      setUseButterflyController: (useButterflyController) => set({ useButterflyController }),
    }),
    { name: 'compendium-debug' },
  ),
)

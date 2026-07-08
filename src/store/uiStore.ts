import { create } from 'zustand'

// Estado de UI global no persistido: drawer del sidebar en mobile.
interface UiStore {
  mobileNavOpen: boolean
  setMobileNav: (v: boolean) => void
  toggleMobileNav: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  mobileNavOpen: false,
  setMobileNav: (v) => set({ mobileNavOpen: v }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
}))

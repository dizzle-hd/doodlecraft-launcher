import { create } from 'zustand'

export type ThemeId = 'dark' | 'light'

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

const STORAGE_KEY = 'doodlecraft.theme'

function apply(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
}

function initial(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY)
  const theme: ThemeId = saved === 'light' ? 'light' : 'dark'
  apply(theme)
  return theme
}

/** Aktives Farbthema (dunkel als Standard), persistiert in localStorage. */
export const useTheme = create<ThemeState>((set) => ({
  theme: initial(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    apply(theme)
    set({ theme })
  }
}))

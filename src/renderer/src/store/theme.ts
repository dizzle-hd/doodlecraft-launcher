import { create } from 'zustand'

export type ThemeId = 'dark' | 'light'
export type AccentId = 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'red' | 'cyan'

interface ThemeState {
  theme: ThemeId
  accent: AccentId
  setTheme: (theme: ThemeId) => void
  setAccent: (accent: AccentId) => void
}

const THEME_KEY = 'doodlecraft.theme'
const ACCENT_KEY = 'doodlecraft.accent'
const ACCENTS: AccentId[] = ['green', 'blue', 'purple', 'pink', 'orange', 'red', 'cyan']

function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
}
function applyAccent(accent: AccentId): void {
  document.documentElement.dataset.accent = accent
}

function initialTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_KEY)
  const theme: ThemeId = saved === 'light' ? 'light' : 'dark'
  applyTheme(theme)
  return theme
}
function initialAccent(): AccentId {
  const saved = localStorage.getItem(ACCENT_KEY) as AccentId | null
  const accent: AccentId = saved && ACCENTS.includes(saved) ? saved : 'green'
  applyAccent(accent)
  return accent
}

/** Aktives Farbthema + Akzentfarbe, persistiert in localStorage. */
export const useTheme = create<ThemeState>((set) => ({
  theme: initialTheme(),
  accent: initialAccent(),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
  setAccent: (accent) => {
    localStorage.setItem(ACCENT_KEY, accent)
    applyAccent(accent)
    set({ accent })
  }
}))

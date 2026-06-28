import { create } from 'zustand'

export type ThemeId = 'dark' | 'light'
export type StyleId = 'doodle' | 'minimal'
export type AccentId = 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'red' | 'cyan'

interface ThemeState {
  theme: ThemeId
  style: StyleId
  accent: AccentId
  setTheme: (theme: ThemeId) => void
  setStyle: (style: StyleId) => void
  setAccent: (accent: AccentId) => void
}

const THEME_KEY = 'doodlecraft.theme'
const STYLE_KEY = 'doodlecraft.style'
const ACCENT_KEY = 'doodlecraft.accent'
const ACCENTS: AccentId[] = ['green', 'blue', 'purple', 'pink', 'orange', 'red', 'cyan']

function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
}
function applyStyle(style: StyleId): void {
  document.documentElement.dataset.style = style
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
function initialStyle(): StyleId {
  const saved = localStorage.getItem(STYLE_KEY)
  // Doodle ist der Standard.
  const style: StyleId = saved === 'minimal' ? 'minimal' : 'doodle'
  applyStyle(style)
  return style
}
function initialAccent(): AccentId {
  const saved = localStorage.getItem(ACCENT_KEY) as AccentId | null
  const accent: AccentId = saved && ACCENTS.includes(saved) ? saved : 'green'
  applyAccent(accent)
  return accent
}

/** Stil (Doodle/Minimal) + Modus (dunkel/hell) + Akzent, in localStorage. */
export const useTheme = create<ThemeState>((set) => ({
  theme: initialTheme(),
  style: initialStyle(),
  accent: initialAccent(),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
  setStyle: (style) => {
    localStorage.setItem(STYLE_KEY, style)
    applyStyle(style)
    set({ style })
  },
  setAccent: (accent) => {
    localStorage.setItem(ACCENT_KEY, accent)
    applyAccent(accent)
    set({ accent })
  }
}))

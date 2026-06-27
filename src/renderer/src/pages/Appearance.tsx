import { useTheme, type ThemeId, type AccentId } from '../store/theme'

const THEMES: { id: ThemeId; name: string; swatch: string }[] = [
  { id: 'dark', name: 'Dunkel', swatch: 'linear-gradient(135deg,#1e2127,#14161a)' },
  { id: 'light', name: 'Hell', swatch: 'linear-gradient(135deg,#ffffff,#e7ebf0)' }
]

const ACCENTS: { id: AccentId; name: string; color: string }[] = [
  { id: 'green', name: 'Grün', color: '#1bd96a' },
  { id: 'blue', name: 'Blau', color: '#3b82f6' },
  { id: 'purple', name: 'Lila', color: '#8b5cf6' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'orange', name: 'Orange', color: '#f59e0b' },
  { id: 'red', name: 'Rot', color: '#ef4444' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' }
]

export default function Appearance(): JSX.Element {
  const { theme, setTheme, accent, setAccent } = useTheme()

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Design</h1>
      </div>

      <h3>Modus</h3>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <div
            key={t.id}
            className={`theme-card ${theme === t.id ? 'is-active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <div className="theme-card__swatch" style={{ background: t.swatch }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{t.name}</strong>
              {theme === t.id && <span style={{ color: 'var(--accent)' }}>✓</span>}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 8 }}>Akzentfarbe</h3>
      <div className="accent-row">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            className={`accent-dot ${accent === a.id ? 'is-active' : ''}`}
            title={a.name}
            style={{ background: a.color }}
            onClick={() => setAccent(a.id)}
          >
            {accent === a.id && <span className="accent-dot__check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

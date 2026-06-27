import { useTheme, type ThemeId } from '../store/theme'

const THEMES: { id: ThemeId; name: string; swatch: string }[] = [
  { id: 'dark', name: 'Dunkel', swatch: 'linear-gradient(135deg,#1e2127,#14161a)' },
  { id: 'light', name: 'Hell', swatch: 'linear-gradient(135deg,#ffffff,#e7ebf0)' }
]

export default function Appearance(): JSX.Element {
  const { theme, setTheme } = useTheme()

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Design</h1>
      </div>

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
    </div>
  )
}

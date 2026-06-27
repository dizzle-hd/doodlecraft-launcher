import { useTheme, type ThemeId, type StyleId, type AccentId } from '../store/theme'

const STYLES: { id: StyleId; name: string; desc: string }[] = [
  { id: 'doodle', name: 'Doodle', desc: 'Handgezeichneter Stil' },
  { id: 'minimal', name: 'Minimal', desc: 'Cleaner, moderner Look' }
]

const MODES: { id: ThemeId; name: string; swatch: string }[] = [
  { id: 'dark', name: 'Dunkel', swatch: 'linear-gradient(135deg,#26201a,#181513)' },
  { id: 'light', name: 'Hell', swatch: 'linear-gradient(135deg,#fffdf5,#ece5d3)' }
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
  const { theme, setTheme, style, setStyle, accent, setAccent } = useTheme()

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Design</h1>
      </div>

      <h3>Stil</h3>
      <div className="theme-grid">
        {STYLES.map((s) => (
          <div
            key={s.id}
            className={`theme-card ${style === s.id ? 'is-active' : ''}`}
            onClick={() => setStyle(s.id)}
          >
            <div
              className="theme-card__swatch"
              style={{
                display: 'grid',
                placeItems: 'center',
                fontFamily: s.id === 'doodle' ? 'var(--font-display)' : 'var(--font-sans)',
                fontSize: '1.5rem',
                color: 'var(--accent)'
              }}
            >
              {s.id === 'doodle' ? '✎ Aa' : 'Aa'}
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{s.name}</strong>
              {style === s.id && <span style={{ color: 'var(--accent)' }}>✓</span>}
            </div>
            <span className="muted" style={{ fontSize: '0.82rem' }}>
              {s.desc}
            </span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 8 }}>Modus</h3>
      <div className="theme-grid">
        {MODES.map((m) => (
          <div
            key={m.id}
            className={`theme-card ${theme === m.id ? 'is-active' : ''}`}
            onClick={() => setTheme(m.id)}
          >
            <div className="theme-card__swatch" style={{ background: m.swatch }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{m.name}</strong>
              {theme === m.id && <span style={{ color: 'var(--accent)' }}>✓</span>}
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

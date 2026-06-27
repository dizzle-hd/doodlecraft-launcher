import type { ReactNode } from 'react'
import SvgDefs from './SvgDefs'

export interface NavItem {
  id: string
  label: string
}

export interface AppShellProps {
  items: NavItem[]
  active: string
  onSelect: (id: string) => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Grundlayout des Launchers: Papier-Hintergrund, Sidebar mit Navigation,
 * scrollbarer Content-Bereich. Rendert die globalen SVG-Defs einmalig.
 */
export default function AppShell({
  items,
  active,
  onSelect,
  footer,
  children
}: AppShellProps): JSX.Element {
  return (
    <div className="shell paper-bg">
      <SvgDefs />
      <aside className="shell__sidebar">
        <div className="shell__brand">DoodleCraft</div>
        {items.map((item) => (
          <button
            key={item.id}
            className={`shell__nav-item ${active === item.id ? 'is-active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {footer}
      </aside>
      <main className="shell__content">{children}</main>
    </div>
  )
}

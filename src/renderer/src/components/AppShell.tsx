import type { ReactNode } from 'react'
import TitleBar from './TitleBar'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
}

export interface AppShellProps {
  items: NavItem[]
  active: string
  onSelect: (id: string) => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Grundlayout: rahmenlose Titelleiste oben, links die Navigation, rechts der
 * scrollbare Content-Bereich.
 */
export default function AppShell({
  items,
  active,
  onSelect,
  footer,
  children
}: AppShellProps): JSX.Element {
  return (
    <div className="shell">
      <TitleBar />
      <div className="shell__body">
        <aside className="sidebar">
          <nav className="sidebar__nav">
            {items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? 'is-active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <span className="nav-item__icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="spacer" />
          {footer}
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}

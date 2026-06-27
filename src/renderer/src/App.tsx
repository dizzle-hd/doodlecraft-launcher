import { useEffect, useState } from 'react'
import AppShell, { type NavItem } from './components/AppShell'
import Gallery from './pages/Gallery'
import Accounts from './pages/Accounts'
import SkinHead from './components/SkinHead'
import { useAccounts } from './store/accounts'

const NAV: NavItem[] = [
  { id: 'play', label: '▶ Spielen' },
  { id: 'instances', label: '☷ Instanzen' },
  { id: 'accounts', label: '☺ Accounts' },
  { id: 'gallery', label: '✎ Design-System' },
  { id: 'settings', label: '⚙ Einstellungen' }
]

/**
 * App-Wurzel. Accounts (M3) und das Design-System (M2) sind live; die übrigen
 * Seiten folgen in späteren Meilensteinen.
 */
export default function App(): JSX.Element {
  const [active, setActive] = useState('accounts')
  const { accounts, activeId, refresh } = useAccounts()
  const current = accounts.find((a) => a.id === activeId) ?? null

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AppShell
      items={NAV}
      active={active}
      onSelect={setActive}
      footer={
        <button
          className="shell__account"
          onClick={() => setActive('accounts')}
          title="Account verwalten"
        >
          {current ? (
            <>
              <SkinHead uuid={current.uuid} name={current.name} size={28} />
              <span className="shell__account-name">{current.name}</span>
            </>
          ) : (
            <span className="shell__account-name">Kein Account</span>
          )}
        </button>
      }
    >
      {active === 'gallery' && <Gallery />}
      {active === 'accounts' && <Accounts />}
      {active !== 'gallery' && active !== 'accounts' && (
        <div className="stack">
          <h1>{NAV.find((n) => n.id === active)?.label}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Diese Seite folgt in einem späteren Meilenstein.
          </p>
        </div>
      )}
    </AppShell>
  )
}

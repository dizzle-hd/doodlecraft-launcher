import { useEffect, useState } from 'react'
import AppShell, { type NavItem } from './components/AppShell'
import Gallery from './pages/Gallery'
import Accounts from './pages/Accounts'
import Instances from './pages/Instances'
import Mods from './pages/Mods'
import Play from './pages/Play'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import SkinHead from './components/SkinHead'
import { useAccounts } from './store/accounts'

const NAV: NavItem[] = [
  { id: 'play', label: '▶ Spielen' },
  { id: 'instances', label: '☷ Instanzen' },
  { id: 'mods', label: '🧩 Mods' },
  { id: 'logs', label: '🪵 Logs' },
  { id: 'accounts', label: '☺ Accounts' },
  { id: 'gallery', label: '✎ Design-System' },
  { id: 'settings', label: '⚙ Einstellungen' }
]

/**
 * App-Wurzel. Spielen/Instanzen (M4), Accounts (M3) und das Design-System (M2)
 * sind live; die übrigen Seiten folgen in späteren Meilensteinen.
 */
export default function App(): JSX.Element {
  const [active, setActive] = useState('play')
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
      {active === 'play' && <Play />}
      {active === 'instances' && <Instances />}
      {active === 'mods' && <Mods />}
      {active === 'logs' && <Logs />}
      {active === 'gallery' && <Gallery />}
      {active === 'accounts' && <Accounts />}
      {active === 'settings' && <Settings />}
    </AppShell>
  )
}

import { useEffect, useState } from 'react'
import AppShell, { type NavItem } from './components/AppShell'
import Play from './pages/Play'
import Instances from './pages/Instances'
import Mods from './pages/Mods'
import Logs from './pages/Logs'
import Accounts from './pages/Accounts'
import Appearance from './pages/Appearance'
import Settings from './pages/Settings'
import SkinHead from './components/SkinHead'
import { useAccounts } from './store/accounts'

/** Schlanke Linien-Icons für die Navigation. */
function Icon({ name }: { name: string }): JSX.Element {
  const p: Record<string, JSX.Element> = {
    play: <path d="M5 3l10 6-10 6z" />,
    instances: (
      <>
        <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" />
        <rect x="10" y="2.5" width="5.5" height="5.5" rx="1" />
        <rect x="2.5" y="10" width="5.5" height="5.5" rx="1" />
        <rect x="10" y="10" width="5.5" height="5.5" rx="1" />
      </>
    ),
    mods: <path d="M7 2.5h4v3a1.5 1.5 0 003 0V8h2.5v4h-3a1.5 1.5 0 000 3H15v.5H3V11h2a1.5 1.5 0 000-3H3V2.5h4z" />,
    logs: (
      <>
        <rect x="2.5" y="3" width="13" height="12" rx="1.5" />
        <path d="M5 7h8M5 10h8M5 13h5" />
      </>
    ),
    accounts: (
      <>
        <circle cx="9" cy="6" r="3" />
        <path d="M3.5 15.5a5.5 5.5 0 0111 0" />
      </>
    ),
    design: (
      <>
        <circle cx="9" cy="9" r="6.5" />
        <circle cx="6.4" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="11.6" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="7" cy="11.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    settings: (
      <>
        <circle cx="9" cy="9" r="2.5" />
        <path d="M9 1.5v2M9 14.5v2M16.5 9h-2M3.5 9h-2M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4M14.3 14.3l-1.4-1.4M5.1 5.1L3.7 3.7" />
      </>
    )
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {name === 'play' || name === 'mods' ? (
        <g fill="currentColor" stroke="none">
          {p[name]}
        </g>
      ) : (
        p[name]
      )}
    </svg>
  )
}

const NAV: NavItem[] = [
  { id: 'play', label: 'Spielen', icon: <Icon name="play" /> },
  { id: 'instances', label: 'Instanzen', icon: <Icon name="instances" /> },
  { id: 'mods', label: 'Mods', icon: <Icon name="mods" /> },
  { id: 'logs', label: 'Logs', icon: <Icon name="logs" /> },
  { id: 'accounts', label: 'Accounts', icon: <Icon name="accounts" /> },
  { id: 'design', label: 'Design', icon: <Icon name="design" /> },
  { id: 'settings', label: 'Einstellungen', icon: <Icon name="settings" /> }
]

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
        <button className="account-pill" onClick={() => setActive('accounts')}>
          {current ? (
            <>
              <SkinHead uuid={current.uuid} name={current.name} size={26} />
              <span className="account-pill__name">{current.name}</span>
            </>
          ) : (
            <span className="account-pill__name muted">Kein Account</span>
          )}
        </button>
      }
    >
      {active === 'play' && <Play onNavigate={setActive} />}
      {active === 'instances' && <Instances />}
      {active === 'mods' && <Mods />}
      {active === 'logs' && <Logs />}
      {active === 'accounts' && <Accounts />}
      {active === 'design' && <Appearance />}
      {active === 'settings' && <Settings />}
    </AppShell>
  )
}

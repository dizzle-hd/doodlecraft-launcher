import { useEffect, useRef, useState } from 'react'
import AppShell, { type NavItem } from './components/AppShell'
import Icon from './components/icons'
import Play from './pages/Play'
import Instances from './pages/Instances'
import Logs from './pages/Logs'
import Accounts from './pages/Accounts'
import Skins from './pages/Skins'
import Appearance from './pages/Appearance'
import Settings from './pages/Settings'
import SkinHead from './components/SkinHead'
import UpdateBanner from './components/UpdateBanner'
import { useAccounts } from './store/accounts'
import { useInstances } from './store/instances'

const NAV: NavItem[] = [
  { id: 'play', label: 'Spielen', icon: <Icon name="play" size={18} /> },
  { id: 'instances', label: 'Instanzen', icon: <Icon name="instances" size={18} /> },
  { id: 'logs', label: 'Logs', icon: <Icon name="logs" size={18} /> },
  { id: 'accounts', label: 'Accounts', icon: <Icon name="accounts" size={18} /> },
  { id: 'skins', label: 'Skins', icon: <Icon name="skin" size={18} /> },
  { id: 'design', label: 'Design', icon: <Icon name="design" size={18} /> },
  { id: 'settings', label: 'Einstellungen', icon: <Icon name="settings" size={18} /> }
]

export default function App(): JSX.Element {
  const [active, setActive] = useState('play')
  const { accounts, activeId, refresh } = useAccounts()
  const { setProgress, setLaunchStatus } = useInstances()
  const current = accounts.find((a) => a.id === activeId) ?? null
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    refresh()
  }, [refresh])

  // Zentrale Abos: Fortschritt/Status app-weit. Beim Spielstart automatisch
  // zur Logs-Ansicht wechseln, damit man die Spielausgabe sofort sieht.
  useEffect(() => {
    const offP = window.api.on('install:progress', setProgress)
    const offL = window.api.on('launch:status', (s) => {
      setLaunchStatus(s)
      if (s.state === 'launching' && activeRef.current !== 'logs') setActive('logs')
    })
    return () => {
      offP()
      offL()
    }
  }, [setProgress, setLaunchStatus])

  return (
    <>
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
      <div className="page-anim" key={active}>
        {active === 'play' && <Play onNavigate={setActive} />}
        {active === 'instances' && <Instances />}
        {active === 'logs' && <Logs />}
        {active === 'accounts' && <Accounts />}
        {active === 'skins' && <Skins />}
        {active === 'design' && <Appearance />}
        {active === 'settings' && <Settings />}
      </div>
    </AppShell>
    <UpdateBanner />
    </>
  )
}

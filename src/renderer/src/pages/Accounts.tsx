import { useEffect, useState } from 'react'
import type { DeviceCodeInfo } from '@shared/ipc'
import { useAccounts } from '../store/accounts'
import DoodleCard from '../components/DoodleCard'
import SkinHead from '../components/SkinHead'
import DeviceCodeDialog from '../components/DeviceCodeDialog'
import { WiredButton } from '../components/wired'

export default function Accounts(): JSX.Element {
  const { accounts, activeId, loaded, refresh, setActive, remove, loginMicrosoft } =
    useAccounts()

  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState<DeviceCodeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
    // Device-Code-Events aus dem Main empfangen.
    return window.api.on('auth:deviceCode', setCode)
  }, [loaded, refresh])

  const handleMicrosoft = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    setCode(null)
    try {
      await loginMicrosoft()
      setBusy(false)
      setCode(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const closeDialog = (): void => {
    setError(null)
    setCode(null)
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1>Accounts</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: -8 }}>
        Melde dich mit deinem Microsoft-Account an — ganz ohne eigene Azure-App.
      </p>

      <DoodleCard title="Account hinzufügen">
        <div className="row">
          <WiredButton elevation={2} onClick={handleMicrosoft} disabled={busy}>
            {busy ? 'Anmeldung läuft …' : '＋ Microsoft-Login'}
          </WiredButton>
        </div>
      </DoodleCard>

      <DoodleCard title={`Gespeicherte Accounts (${accounts.length})`}>
        {accounts.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            Noch keine Accounts. Füge oben einen hinzu.
          </p>
        ) : (
          <ul className="account-list">
            {accounts.map((a) => (
              <li
                key={a.id}
                className={`account-row ${a.id === activeId ? 'is-active' : ''}`}
              >
                <SkinHead uuid={a.uuid} name={a.name} />
                <div className="account-row__info">
                  <span className="account-row__name">{a.name}</span>
                  <span className="doodle-chip">Microsoft</span>
                </div>
                <div className="row">
                  {a.id === activeId ? (
                    <span className="account-row__active">aktiv ✓</span>
                  ) : (
                    <WiredButton onClick={() => setActive(a.id)}>
                      Auswählen
                    </WiredButton>
                  )}
                  <WiredButton onClick={() => remove(a.id)}>Entfernen</WiredButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DoodleCard>

      {(busy || error) && (
        <DeviceCodeDialog code={code} error={error} onClose={closeDialog} />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { DeviceCodeInfo } from '@shared/ipc'
import { useAccounts } from '../store/accounts'
import { Button, Card, Chip } from '../components/ui'
import SkinHead from '../components/SkinHead'
import DeviceCodeDialog from '../components/DeviceCodeDialog'

export default function Accounts(): JSX.Element {
  const { accounts, activeId, loaded, refresh, setActive, remove, loginMicrosoft } =
    useAccounts()

  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState<DeviceCodeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
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
      <div className="page-head">
        <h1>Accounts</h1>
        <Button variant="primary" onClick={handleMicrosoft} disabled={busy}>
          {busy ? 'Anmeldung läuft …' : '＋ Microsoft-Login'}
        </Button>
      </div>

      <Card>
        {accounts.length === 0 ? (
          <div className="empty">Noch keine Accounts. Melde dich oben an.</div>
        ) : (
          <ul className="account-list">
            {accounts.map((a) => (
              <li key={a.id} className="account-row">
                <SkinHead uuid={a.uuid} name={a.name} />
                <div className="account-row__info">
                  <span className="account-row__name">{a.name}</span>
                  <Chip>Microsoft</Chip>
                </div>
                {a.id === activeId ? (
                  <span className="account-row__active">aktiv ✓</span>
                ) : (
                  <Button small onClick={() => setActive(a.id)}>
                    Auswählen
                  </Button>
                )}
                <Button small variant="danger" onClick={() => remove(a.id)}>
                  Entfernen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(busy || error) && (
        <DeviceCodeDialog code={code} error={error} onClose={closeDialog} />
      )}
    </div>
  )
}

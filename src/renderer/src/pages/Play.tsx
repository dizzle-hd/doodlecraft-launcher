import { useEffect } from 'react'
import { useInstances } from '../store/instances'
import { useAccounts } from '../store/accounts'
import DoodleCard from '../components/DoodleCard'
import SkinHead from '../components/SkinHead'
import { WiredButton } from '../components/wired'

/**
 * Start-Seite. Zeigt die zuletzt gespielte Instanz und den aktiven Account.
 * Der eigentliche Spielstart folgt in M5.
 */
export default function Play(): JSX.Element {
  const { instances, loaded, refresh } = useInstances()
  const { accounts, activeId, refresh: refreshAccounts } = useAccounts()

  useEffect(() => {
    if (!loaded) refresh()
    refreshAccounts()
  }, [loaded, refresh, refreshAccounts])

  const current = instances[0] ?? null
  const account = accounts.find((a) => a.id === activeId) ?? null
  const canPlay = current?.installed && account !== null

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Spielen</h1>

      <DoodleCard title="Bereit?">
        {current ? (
          <div className="play-summary">
            <div className="instance-row__info">
              <span className="instance-row__name">{current.name}</span>
              <div className="row" style={{ gap: 8 }}>
                <span className="doodle-chip">{current.mcVersion}</span>
                <span className="doodle-chip">
                  {current.installed ? 'installiert ✓' : 'nicht installiert'}
                </span>
              </div>
            </div>

            <div className="row" style={{ marginTop: 6 }}>
              {account ? (
                <>
                  <SkinHead uuid={account.uuid} name={account.name} size={28} />
                  <span>{account.name}</span>
                </>
              ) : (
                <span style={{ color: 'var(--ink-soft)' }}>Kein Account ausgewählt</span>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <WiredButton elevation={3} disabled={!canPlay}>
                ▶ Spielen
              </WiredButton>
            </div>
            <p style={{ color: 'var(--ink-faint)', fontSize: '0.85rem', marginTop: 10 }}>
              {!current.installed
                ? 'Diese Instanz ist noch nicht installiert (siehe „Instanzen“).'
                : !account
                  ? 'Bitte zuerst einen Account auswählen (siehe „Accounts“).'
                  : 'Der Spielstart wird in M5 aktiviert.'}
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--ink-soft)' }}>
            Noch keine Instanz vorhanden. Lege unter „Instanzen“ eine an.
          </p>
        )}
      </DoodleCard>
    </div>
  )
}

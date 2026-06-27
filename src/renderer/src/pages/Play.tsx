import { useEffect, useState } from 'react'
import type { LaunchStatus } from '@shared/ipc'
import { useInstances } from '../store/instances'
import { useAccounts } from '../store/accounts'
import DoodleCard from '../components/DoodleCard'
import SkinHead from '../components/SkinHead'
import { WiredButton, WiredCombo, WiredItem } from '../components/wired'

/** Menschlicher Text + ob ein Start-Status „beschäftigt" bedeutet. */
function describeStatus(status: LaunchStatus | undefined): {
  text: string
  busy: boolean
} {
  if (!status) return { text: '', busy: false }
  switch (status.state) {
    case 'launching':
      return { text: 'Wird gestartet …', busy: true }
    case 'running':
      return { text: 'Läuft – viel Spaß!', busy: true }
    case 'exited':
      return {
        text:
          status.code === 0
            ? 'Spiel beendet.'
            : `Spiel beendet (Code ${status.code}).${
                status.error ? ' Absturz – siehe Crash-Report.' : ''
              }`,
        busy: false
      }
    case 'error':
      return { text: `Start fehlgeschlagen: ${status.error ?? 'unbekannt'}`, busy: false }
    default:
      return { text: '', busy: false }
  }
}

/**
 * Start-Seite. Instanz wählen, aktiver Account, großer „Spielen"-Button (M5).
 */
export default function Play(): JSX.Element {
  const { instances, loaded, launchStatus, refresh, launch } = useInstances()
  const { accounts, activeId, refresh: refreshAccounts } = useAccounts()
  const { setLaunchStatus } = useInstances()

  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (!loaded) refresh()
    refreshAccounts()
    return window.api.on('launch:status', setLaunchStatus)
  }, [loaded, refresh, refreshAccounts, setLaunchStatus])

  // Standardmäßig die zuletzt gespielte Instanz vorauswählen.
  useEffect(() => {
    if (!selectedId && instances.length > 0) setSelectedId(instances[0].id)
  }, [instances, selectedId])

  const current = instances.find((i) => i.id === selectedId) ?? instances[0] ?? null
  const account = accounts.find((a) => a.id === activeId) ?? null
  const status = current ? launchStatus[current.id] : undefined
  const { text: statusText, busy } = describeStatus(status)
  const canPlay = Boolean(current?.installed && account) && !busy

  const hint = !current?.installed
    ? 'Diese Instanz ist noch nicht installiert (siehe „Instanzen“).'
    : !account
      ? 'Bitte zuerst einen Account auswählen (siehe „Accounts“).'
      : ''

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Spielen</h1>

      <DoodleCard title="Bereit?">
        {current ? (
          <div className="play-summary">
            {instances.length > 1 && (
              <div className="row" style={{ marginBottom: 10 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Instanz:</span>
                <WiredCombo
                  value={current.id}
                  onSelect={setSelectedId}
                  style={{ minWidth: 220 }}
                >
                  {instances.map((i) => (
                    <WiredItem key={i.id} value={i.id}>
                      {i.name} · {i.mcVersion}
                    </WiredItem>
                  ))}
                </WiredCombo>
              </div>
            )}

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
              <WiredButton
                elevation={3}
                disabled={!canPlay}
                onClick={() => current && launch(current.id)}
              >
                {busy ? '▶ läuft …' : '▶ Spielen'}
              </WiredButton>
            </div>

            {(statusText || hint) && (
              <p
                style={{
                  color:
                    status?.state === 'error'
                      ? 'var(--danger)'
                      : 'var(--ink-faint)',
                  fontSize: '0.85rem',
                  marginTop: 10
                }}
              >
                {statusText || hint}
              </p>
            )}
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

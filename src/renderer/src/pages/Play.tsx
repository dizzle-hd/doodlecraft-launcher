import { useEffect, useState } from 'react'
import { useInstances } from '../store/instances'
import { useAccounts } from '../store/accounts'
import { Button, Chip, ProgressBar, Select } from '../components/ui'
import SkinHead from '../components/SkinHead'

const PHASE_LABEL: Record<string, string> = {
  minecraft: 'Minecraft wird geladen',
  java: 'Java wird beschafft',
  loader: 'Mod-Loader wird installiert',
  done: 'Fertig',
  error: 'Fehler'
}

export default function Play({
  onNavigate
}: {
  onNavigate: (id: string) => void
}): JSX.Element {
  const {
    instances,
    loaded,
    progress,
    launchStatus,
    refresh,
    install,
    launch,
    setProgress,
    setLaunchStatus
  } = useInstances()
  const { accounts, activeId, refresh: refreshAccounts } = useAccounts()

  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
    refreshAccounts()
    const offP = window.api.on('install:progress', setProgress)
    const offL = window.api.on('launch:status', setLaunchStatus)
    return () => {
      offP()
      offL()
    }
  }, [loaded, refresh, refreshAccounts, setProgress, setLaunchStatus])

  useEffect(() => {
    if (!selectedId && instances.length > 0) setSelectedId(instances[0].id)
  }, [instances, selectedId])

  const current = instances.find((i) => i.id === selectedId) ?? instances[0] ?? null
  const account = accounts.find((a) => a.id === activeId) ?? null

  const prog = current ? progress[current.id] : undefined
  const installing = prog !== undefined && prog.phase !== 'done' && prog.phase !== 'error'
  const launch_ = current ? launchStatus[current.id] : undefined
  const running = launch_?.state === 'launching' || launch_?.state === 'running'
  const busy = installing || running

  const handlePlay = async (): Promise<void> => {
    if (!current) return
    if (!account) {
      onNavigate('accounts')
      return
    }
    setError(null)
    try {
      if (!current.installed) {
        await install(current.id)
      }
      await launch(current.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!current) {
    return (
      <div className="stack">
        <h1>Spielen</h1>
        <div className="empty">
          Noch keine Instanz. Lege unter „Instanzen“ deine erste an.
        </div>
      </div>
    )
  }

  const statusLine = running
    ? launch_?.state === 'running'
      ? 'Läuft – viel Spaß!'
      : 'Wird gestartet …'
    : launch_?.state === 'exited'
      ? `Spiel beendet${launch_.code ? ` (Code ${launch_.code})` : ''}.`
      : ''

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Spielen</h1>
        {instances.length > 1 && (
          <Select
            value={current.id}
            onChange={setSelectedId}
            options={instances.map((i) => ({
              value: i.id,
              label: `${i.name} · ${i.mcVersion}`
            }))}
          />
        )}
      </div>

      <div className="play-hero">
        <div className="row" style={{ gap: 14 }}>
          <div className="instance-card__icon" style={{ width: 56, height: 56 }}>
            🎮
          </div>
          <div>
            <div className="play-hero__title">{current.name}</div>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              <Chip>{current.mcVersion}</Chip>
              {current.loader && (
                <Chip>
                  {current.loader}
                  {current.loaderVersion ? ` ${current.loaderVersion}` : ''}
                </Chip>
              )}
              <Chip tone={current.installed ? 'accent' : 'default'}>
                {current.installed ? 'installiert' : 'nicht installiert'}
              </Chip>
            </div>
          </div>
        </div>

        <div className="row">
          {account ? (
            <>
              <SkinHead uuid={account.uuid} name={account.name} size={26} />
              <span className="text-soft">{account.name}</span>
            </>
          ) : (
            <span className="muted">Kein Account ausgewählt</span>
          )}
        </div>

        {installing && prog && (
          <div className="stack" style={{ gap: 6 }}>
            <ProgressBar value={prog.progress} />
            <span className="muted" style={{ fontSize: '0.82rem' }}>
              {PHASE_LABEL[prog.phase] ?? prog.phase} · {Math.round(prog.progress * 100)}%
            </span>
          </div>
        )}

        <div className="row">
          <Button
            variant="primary"
            className="play-btn"
            disabled={busy}
            onClick={handlePlay}
          >
            {installing
              ? 'Installiere …'
              : running
                ? 'Läuft …'
                : !account
                  ? 'Account wählen'
                  : current.installed
                    ? '▶ Spielen'
                    : '⤓ Installieren & Spielen'}
          </Button>
          {statusLine && <span className="text-soft">{statusLine}</span>}
        </div>

        {(error || prog?.phase === 'error') && (
          <p style={{ color: 'var(--danger)', margin: 0 }}>
            {error ?? prog?.error ?? 'Installation fehlgeschlagen.'}
          </p>
        )}
      </div>
    </div>
  )
}

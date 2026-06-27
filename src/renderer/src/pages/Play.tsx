import { useEffect, useState } from 'react'
import { useInstances } from '../store/instances'
import { useAccounts } from '../store/accounts'
import { Chip, ProgressBar, Select } from '../components/ui'
import Icon from '../components/icons'
import SkinRender from '../components/SkinRender'

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
  const { instances, loaded, progress, launchStatus, refresh, play } = useInstances()
  const { accounts, activeId, refresh: refreshAccounts } = useAccounts()

  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
    refreshAccounts()
  }, [loaded, refresh, refreshAccounts])

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
      await play(current.id)
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

  const label = installing
    ? 'Installiere …'
    : running
      ? 'Läuft …'
      : !account
        ? 'Account wählen'
        : current.installed
          ? 'Spielen'
          : 'Installieren & Spielen'

  const statusLine = running
    ? launch_?.state === 'running'
      ? 'Läuft – viel Spaß!'
      : 'Wird gestartet …'
    : launch_?.state === 'exited'
      ? `Spiel beendet${launch_.code ? ` (Code ${launch_.code})` : ''}.`
      : ''

  return (
    <div className="stack play-page">
      <div className="play-stage">
        <div className="play-stage__meta">
          <div className="play-stage__title">{current.name}</div>
          <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
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

        {account ? (
          <SkinRender uuid={account.uuid} height={400} rotation={0.45} />
        ) : (
          <div className="skin-render" style={{ height: 400 }}>
            <div className="skin-render__msg muted">Kein Account – Skin nicht verfügbar</div>
          </div>
        )}

        <div className="play-pill">
          <button className="play-pill__play" disabled={busy} onClick={handlePlay}>
            {!installing && !running && account && (
              <Icon name={current.installed ? 'play' : 'download'} size={20} />
            )}
            {label}
          </button>
          {instances.length > 1 && (
            <>
              <span className="play-pill__div" />
              <Select
                className="play-pill__switch"
                value={current.id}
                onChange={setSelectedId}
                options={instances.map((i) => ({ value: i.id, label: i.name }))}
              />
            </>
          )}
        </div>
      </div>

      {installing && prog && (
        <div className="stack play-progress" style={{ gap: 6 }}>
          <ProgressBar value={prog.progress} />
          <span className="muted" style={{ fontSize: '0.82rem', textAlign: 'center' }}>
            {PHASE_LABEL[prog.phase] ?? prog.phase} · {Math.round(prog.progress * 100)}%
          </span>
        </div>
      )}

      {statusLine && (
        <p className="text-soft" style={{ textAlign: 'center', margin: 0 }}>
          {statusLine}
        </p>
      )}
      {(error || prog?.phase === 'error') && (
        <p style={{ color: 'var(--danger)', textAlign: 'center', margin: 0 }}>
          {error ?? prog?.error ?? 'Installation fehlgeschlagen.'}
        </p>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useInstances } from '../store/instances'
import { useAccounts } from '../store/accounts'
import { Chip, ProgressBar } from '../components/ui'
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

  const idx = instances.findIndex((i) => i.id === selectedId)
  const current = instances[idx] ?? instances[0] ?? null
  const account = accounts.find((a) => a.id === activeId) ?? null

  const prog = current ? progress[current.id] : undefined
  const installing = prog !== undefined && prog.phase !== 'done' && prog.phase !== 'error'
  const launch_ = current ? launchStatus[current.id] : undefined
  const running = launch_?.state === 'launching' || launch_?.state === 'running'
  const busy = installing || running

  const cycle = (): void => {
    if (instances.length < 2) return
    const next = instances[(Math.max(0, idx) + 1) % instances.length]
    setSelectedId(next.id)
  }

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
    <div className="play-screen">
      {account ? (
        <SkinRender uuid={account.uuid} height={500} />
      ) : (
        <div className="skin-render" style={{ height: 500 }}>
          <div className="skin-render__msg muted">Kein Account – Skin nicht verfügbar</div>
        </div>
      )}

      <div className="play-screen__title">
        <span>{current.name}</span>
        {instances.length > 1 && (
          <button className="switch-btn" title="Instanz wechseln" onClick={cycle}>
            <Icon name="switch" size={20} />
          </button>
        )}
      </div>

      <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
        <Chip>{current.mcVersion}</Chip>
        {current.loader && (
          <Chip>
            {current.loader}
            {current.loaderVersion ? ` ${current.loaderVersion}` : ''}
          </Chip>
        )}
      </div>

      <button className="play-big" disabled={busy} onClick={handlePlay}>
        {!installing && !running && account && (
          <Icon name={current.installed ? 'play' : 'download'} size={22} />
        )}
        {label}
      </button>

      {installing && prog && (
        <div className="play-screen__progress">
          <ProgressBar value={prog.progress} />
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            {PHASE_LABEL[prog.phase] ?? prog.phase} · {Math.round(prog.progress * 100)}%
          </span>
        </div>
      )}
      {statusLine && <p className="text-soft" style={{ margin: 0 }}>{statusLine}</p>}
      {(error || prog?.phase === 'error') && (
        <p style={{ color: 'var(--danger)', margin: 0 }}>
          {error ?? prog?.error ?? 'Installation fehlgeschlagen.'}
        </p>
      )}
    </div>
  )
}

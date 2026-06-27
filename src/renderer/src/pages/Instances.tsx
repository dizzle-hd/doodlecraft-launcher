import { useEffect, useState } from 'react'
import type { Instance } from '@shared/ipc'
import { useInstances } from '../store/instances'
import DoodleCard from '../components/DoodleCard'
import RoughProgressBar from '../components/RoughProgressBar'
import { WiredButton, WiredCombo, WiredInput, WiredItem } from '../components/wired'

const PHASE_LABEL: Record<string, string> = {
  minecraft: 'Minecraft',
  java: 'Java',
  done: 'Fertig',
  error: 'Fehler'
}

export default function Instances(): JSX.Element {
  const {
    instances,
    versions,
    settings,
    loaded,
    progress,
    refresh,
    loadVersions,
    setShowSnapshots,
    create,
    remove,
    duplicate,
    install,
    setProgress
  } = useInstances()

  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
    loadVersions()
    return window.api.on('install:progress', setProgress)
  }, [loaded, refresh, loadVersions, setProgress])

  // Standardauswahl auf die neueste Release setzen, sobald die Liste da ist.
  useEffect(() => {
    if (!version && versions) setVersion(versions.latestRelease)
  }, [versions, version])

  const handleCreate = async (): Promise<void> => {
    setError(null)
    try {
      await create({ name, mcVersion: version })
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const showSnapshots = settings?.showSnapshots ?? false

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>Instanzen</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: -8 }}>
        Lege getrennte Spielstände mit eigener Version, Mods und Konfiguration an.
      </p>

      <DoodleCard title="Neue Instanz">
        <div className="row">
          <WiredInput
            value={name}
            placeholder="Name der Instanz"
            onValueChange={setName}
          />
          {versions ? (
            <WiredCombo value={version} onSelect={setVersion} style={{ minWidth: 180 }}>
              {versions.versions.map((v) => (
                <WiredItem key={v.id} value={v.id}>
                  {v.id}
                  {v.type !== 'release' ? ` · ${v.type}` : ''}
                </WiredItem>
              ))}
            </WiredCombo>
          ) : (
            <span style={{ color: 'var(--ink-faint)' }}>Versionen werden geladen …</span>
          )}
          <WiredButton elevation={2} onClick={handleCreate}>
            ＋ Anlegen
          </WiredButton>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <WiredButton onClick={() => setShowSnapshots(!showSnapshots)}>
            Snapshots: {showSnapshots ? 'an' : 'aus'}
          </WiredButton>
          {versions && (
            <span style={{ color: 'var(--ink-faint)', fontSize: '0.85rem' }}>
              Neueste Release: {versions.latestRelease}
            </span>
          )}
        </div>

        {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
      </DoodleCard>

      <DoodleCard title={`Deine Instanzen (${instances.length})`}>
        {instances.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            Noch keine Instanzen. Lege oben deine erste an.
          </p>
        ) : (
          <ul className="instance-list">
            {instances.map((inst) => (
              <InstanceRow
                key={inst.id}
                instance={inst}
                progress={progress[inst.id]}
                onInstall={() => install(inst.id)}
                onDuplicate={() => duplicate(inst.id)}
                onRemove={() => remove(inst.id)}
              />
            ))}
          </ul>
        )}
      </DoodleCard>
    </div>
  )
}

interface RowProps {
  instance: Instance
  progress?: ReturnType<typeof useInstances.getState>['progress'][string]
  onInstall: () => void
  onDuplicate: () => void
  onRemove: () => void
}

function InstanceRow({
  instance,
  progress,
  onInstall,
  onDuplicate,
  onRemove
}: RowProps): JSX.Element {
  const busy = progress !== undefined && progress.phase !== 'done' && progress.phase !== 'error'

  return (
    <li className="instance-row">
      <div className="instance-row__info">
        <span className="instance-row__name">{instance.name}</span>
        <div className="row" style={{ gap: 8 }}>
          <span className="doodle-chip">{instance.mcVersion}</span>
          {instance.loader && <span className="doodle-chip">{instance.loader}</span>}
          <span className="doodle-chip">
            {instance.installed ? 'installiert ✓' : 'nicht installiert'}
          </span>
        </div>
      </div>

      <div className="row">
        <WiredButton
          elevation={2}
          onClick={onInstall}
          disabled={busy}
        >
          {busy ? 'läuft …' : instance.installed ? 'Reparieren' : '⤓ Installieren'}
        </WiredButton>
        <WiredButton onClick={onDuplicate} disabled={busy}>
          Duplizieren
        </WiredButton>
        <WiredButton onClick={onRemove} disabled={busy}>
          Löschen
        </WiredButton>
      </div>

      {progress && progress.phase !== 'done' && (
        <div className="instance-row__progress">
          <RoughProgressBar
            value={progress.phase === 'error' ? 1 : progress.progress}
            color={progress.phase === 'error' ? 'var(--danger)' : 'var(--accent)'}
            label={
              progress.phase === 'error'
                ? `Fehler: ${progress.error ?? 'unbekannt'}`
                : `${PHASE_LABEL[progress.phase] ?? progress.phase} · ${Math.round(
                    progress.progress * 100
                  )}%`
            }
          />
        </div>
      )}
    </li>
  )
}

import { useEffect, useState } from 'react'
import type { Instance, LoaderType, LoaderVersion } from '@shared/ipc'
import { useInstances } from '../store/instances'
import DoodleCard from '../components/DoodleCard'
import RoughProgressBar from '../components/RoughProgressBar'
import { WiredButton, WiredCombo, WiredInput, WiredItem } from '../components/wired'

const PHASE_LABEL: Record<string, string> = {
  minecraft: 'Minecraft',
  java: 'Java',
  loader: 'Mod-Loader',
  done: 'Fertig',
  error: 'Fehler'
}

const LOADERS: { value: '' | LoaderType; label: string }[] = [
  { value: '', label: 'Vanilla' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'quilt', label: 'Quilt' }
]

export default function Instances(): JSX.Element {
  const {
    instances,
    versions,
    settings,
    loaded,
    progress,
    launchStatus,
    refresh,
    loadVersions,
    setShowSnapshots,
    create,
    remove,
    duplicate,
    install,
    launch,
    setProgress,
    setLaunchStatus
  } = useInstances()

  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [loader, setLoader] = useState<'' | LoaderType>('')
  const [loaderVersion, setLoaderVersion] = useState('')
  const [loaderVersions, setLoaderVersions] = useState<LoaderVersion[]>([])
  const [loaderLoading, setLoaderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
    loadVersions()
    const offInstall = window.api.on('install:progress', setProgress)
    const offLaunch = window.api.on('launch:status', setLaunchStatus)
    return () => {
      offInstall()
      offLaunch()
    }
  }, [loaded, refresh, loadVersions, setProgress, setLaunchStatus])

  // Standardauswahl auf die neueste Release setzen, sobald die Liste da ist.
  useEffect(() => {
    if (!version && versions) setVersion(versions.latestRelease)
  }, [versions, version])

  // Loader-Versionen passend zu Loader + MC-Version laden.
  useEffect(() => {
    setLoaderVersion('')
    setLoaderVersions([])
    if (!loader || !version) return
    let cancelled = false
    setLoaderLoading(true)
    window.api
      .invoke('loaders:list', loader, version)
      .then((list) => {
        if (!cancelled) setLoaderVersions(list)
      })
      .catch(() => {
        if (!cancelled) setLoaderVersions([])
      })
      .finally(() => {
        if (!cancelled) setLoaderLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loader, version])

  const handleCreate = async (): Promise<void> => {
    setError(null)
    try {
      await create({
        name,
        mcVersion: version,
        loader: loader || undefined,
        loaderVersion: loaderVersion || undefined
      })
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
          <span style={{ color: 'var(--ink-soft)' }}>Loader:</span>
          <WiredCombo
            value={loader}
            onSelect={(v) => setLoader(v as '' | LoaderType)}
            style={{ minWidth: 130 }}
          >
            {LOADERS.map((l) => (
              <WiredItem key={l.value || 'vanilla'} value={l.value}>
                {l.label}
              </WiredItem>
            ))}
          </WiredCombo>

          {loader &&
            (loaderLoading ? (
              <span style={{ color: 'var(--ink-faint)' }}>Loader-Versionen …</span>
            ) : (
              <WiredCombo
                value={loaderVersion}
                onSelect={setLoaderVersion}
                style={{ minWidth: 200 }}
              >
                <WiredItem value="">Neueste (empfohlen)</WiredItem>
                {loaderVersions.map((lv) => (
                  <WiredItem key={lv.version} value={lv.version}>
                    {lv.version}
                    {lv.recommended ? ' · empfohlen' : lv.stable ? ' · stabil' : ''}
                  </WiredItem>
                ))}
              </WiredCombo>
            ))}
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
                launchState={launchStatus[inst.id]?.state}
                onInstall={() => install(inst.id)}
                onLaunch={() => launch(inst.id)}
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
  launchState?: ReturnType<typeof useInstances.getState>['launchStatus'][string]['state']
  onInstall: () => void
  onLaunch: () => void
  onDuplicate: () => void
  onRemove: () => void
}

function InstanceRow({
  instance,
  progress,
  launchState,
  onInstall,
  onLaunch,
  onDuplicate,
  onRemove
}: RowProps): JSX.Element {
  const installing =
    progress !== undefined && progress.phase !== 'done' && progress.phase !== 'error'
  const running = launchState === 'launching' || launchState === 'running'
  const busy = installing || running

  return (
    <li className="instance-row">
      <div className="instance-row__info">
        <span className="instance-row__name">{instance.name}</span>
        <div className="row" style={{ gap: 8 }}>
          <span className="doodle-chip">{instance.mcVersion}</span>
          {instance.loader && (
            <span className="doodle-chip">
              {instance.loader}
              {instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}
            </span>
          )}
          <span className="doodle-chip">
            {running
              ? 'läuft ▸'
              : instance.installed
                ? 'installiert ✓'
                : 'nicht installiert'}
          </span>
        </div>
      </div>

      <div className="row">
        {instance.installed && (
          <WiredButton elevation={2} onClick={onLaunch} disabled={busy}>
            {running ? '▶ läuft …' : '▶ Spielen'}
          </WiredButton>
        )}
        <WiredButton onClick={onInstall} disabled={busy}>
          {installing ? 'läuft …' : instance.installed ? 'Reparieren' : '⤓ Installieren'}
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

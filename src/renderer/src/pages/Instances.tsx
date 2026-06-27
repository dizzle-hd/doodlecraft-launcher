import { useEffect, useState } from 'react'
import type {
  Instance,
  InstallProgress,
  LoaderType,
  LoaderVersion,
  ModSearchHit
} from '@shared/ipc'
import { useInstances } from '../store/instances'
import { Button, Chip, IconButton, Input, Modal, ProgressBar, Select, Spinner } from '../components/ui'
import Icon from '../components/icons'
import { InstanceIcon, IconPicker } from '../components/InstanceIcon'

const PHASE_LABEL: Record<string, string> = {
  minecraft: 'Minecraft',
  java: 'Java',
  loader: 'Loader',
  done: 'Fertig',
  error: 'Fehler'
}

const LOADER_OPTS = [
  { value: '', label: 'Vanilla' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'quilt', label: 'Quilt' }
]

export default function Instances(): JSX.Element {
  const store = useInstances()
  const {
    instances,
    loaded,
    progress,
    launchStatus,
    refresh,
    remove,
    duplicate,
    rename,
    setIcon,
    openFolder,
    install,
    launch,
    setProgress,
    setLaunchStatus
  } = store

  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!loaded) refresh()
    const offP = window.api.on('install:progress', setProgress)
    const offL = window.api.on('launch:status', setLaunchStatus)
    return () => {
      offP()
      offL()
    }
  }, [loaded, refresh, setProgress, setLaunchStatus])

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Instanzen</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> Neue Instanz
        </Button>
      </div>

      {instances.length === 0 ? (
        <div className="empty">
          Noch keine Instanzen. Erstelle mit „＋ Neue Instanz“ deine erste.
        </div>
      ) : (
        <div className="card-grid">
          {instances.map((inst) => (
            <InstanceCard
              key={inst.id}
              instance={inst}
              progress={progress[inst.id]}
              launchState={launchStatus[inst.id]?.state}
              onInstall={() => install(inst.id)}
              onLaunch={() => launch(inst.id)}
              onDuplicate={() => duplicate(inst.id)}
              onRemove={() => remove(inst.id)}
              onRename={(name) => rename(inst.id, name)}
              onSetIcon={(icon) => setIcon(inst.id, icon)}
              onOpenFolder={() => openFolder(inst.id)}
            />
          ))}
        </div>
      )}

      {creating && <CreateInstanceModal onClose={() => setCreating(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------

interface CardProps {
  instance: Instance
  progress?: InstallProgress
  launchState?: 'launching' | 'running' | 'exited' | 'error'
  onInstall: () => void
  onLaunch: () => void
  onDuplicate: () => void
  onRemove: () => void
  onRename: (name: string) => void
  onSetIcon: (icon: string) => void
  onOpenFolder: () => void
}

function InstanceCard({
  instance,
  progress,
  launchState,
  onInstall,
  onLaunch,
  onDuplicate,
  onRemove,
  onRename,
  onSetIcon,
  onOpenFolder
}: CardProps): JSX.Element {
  const installing =
    progress !== undefined && progress.phase !== 'done' && progress.phase !== 'error'
  const running = launchState === 'launching' || launchState === 'running'
  const busy = installing || running

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(instance.name)
  const [picking, setPicking] = useState(false)

  const commit = (): void => {
    const t = draft.trim()
    if (t && t !== instance.name) onRename(t)
    setEditing(false)
  }

  return (
    <div className="instance-card">
      <div className="instance-card__top">
        <button
          className="instance-card__icon instance-card__icon--btn"
          title="Icon ändern"
          onClick={() => setPicking(true)}
        >
          <InstanceIcon icon={instance.icon} size={28} />
        </button>
        {picking && (
          <IconPicker
            current={instance.icon}
            onPick={(icon) => {
              onSetIcon(icon)
              setPicking(false)
            }}
            onClose={() => setPicking(false)}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? (
            <Input value={draft} onChange={setDraft} onEnter={commit} full />
          ) : (
            <div className="instance-card__name">{instance.name}</div>
          )}
          <div className="instance-card__meta">
            <Chip>{instance.mcVersion}</Chip>
            {instance.loader && <Chip>{instance.loader}</Chip>}
            <Chip tone={running ? 'accent' : 'default'}>
              {running ? 'läuft' : instance.installed ? 'installiert' : 'nicht installiert'}
            </Chip>
          </div>
        </div>
      </div>

      {progress && progress.phase !== 'done' && (
        <div className="stack" style={{ gap: 5 }}>
          <ProgressBar
            value={progress.phase === 'error' ? 1 : progress.progress}
            tone={progress.phase === 'error' ? 'danger' : 'accent'}
          />
          <span
            className="muted"
            style={{
              fontSize: '0.78rem',
              color: progress.phase === 'error' ? 'var(--danger)' : undefined
            }}
          >
            {progress.phase === 'error'
              ? `Fehler: ${progress.error ?? 'unbekannt'}`
              : `${PHASE_LABEL[progress.phase] ?? progress.phase} · ${Math.round(
                  progress.progress * 100
                )}%`}
          </span>
        </div>
      )}

      <div className="instance-card__actions">
        {instance.installed && (
          <Button variant="primary" small onClick={onLaunch} disabled={busy} full>
            {running ? '▶ läuft …' : '▶ Spielen'}
          </Button>
        )}
        <Button small onClick={onInstall} disabled={busy} full={!instance.installed}>
          {installing ? 'läuft …' : instance.installed ? 'Reparieren' : '⤓ Installieren'}
        </Button>
      </div>

      {editing ? (
        <div className="instance-card__more">
          <Button small variant="primary" onClick={commit}>
            OK
          </Button>
          <Button small variant="ghost" onClick={() => setEditing(false)}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <div className="instance-card__more">
          <IconButton title="Umbenennen" onClick={() => setEditing(true)}>
            <Icon name="edit" size={17} />
          </IconButton>
          <IconButton title="Ordner öffnen" onClick={onOpenFolder}>
            <Icon name="folder" size={17} />
          </IconButton>
          <IconButton title="Duplizieren" onClick={onDuplicate}>
            <Icon name="copy" size={17} />
          </IconButton>
          <IconButton title="Löschen" danger onClick={onRemove}>
            <Icon name="trash" size={17} />
          </IconButton>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function CreateInstanceModal({ onClose }: { onClose: () => void }): JSX.Element {
  const { versions, settings, loadVersions, setShowSnapshots, create, refresh } =
    useInstances()
  const [tab, setTab] = useState<'empty' | 'modpack'>('empty')

  // --- Leere Instanz ---
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [pickingIcon, setPickingIcon] = useState(false)
  const [version, setVersion] = useState('')
  const [loader, setLoader] = useState<'' | LoaderType>('')
  const [loaderVersion, setLoaderVersion] = useState('')
  const [loaderVersions, setLoaderVersions] = useState<LoaderVersion[]>([])
  const [loaderLoading, setLoaderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  useEffect(() => {
    if (!version && versions) setVersion(versions.latestRelease)
  }, [versions, version])

  useEffect(() => {
    setLoaderVersion('')
    setLoaderVersions([])
    if (!loader || !version) return
    let cancelled = false
    setLoaderLoading(true)
    window.api
      .invoke('loaders:list', loader, version)
      .then((l) => !cancelled && setLoaderVersions(l))
      .catch(() => !cancelled && setLoaderVersions([]))
      .finally(() => !cancelled && setLoaderLoading(false))
    return () => {
      cancelled = true
    }
  }, [loader, version])

  const handleCreate = async (): Promise<void> => {
    setError(null)
    setCreating(true)
    try {
      await create({
        name,
        mcVersion: version,
        loader: loader || undefined,
        loaderVersion: loaderVersion || undefined,
        icon: icon || undefined
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCreating(false)
    }
  }

  const showSnapshots = settings?.showSnapshots ?? false

  return (
    <Modal
      open
      onClose={onClose}
      title="Neue Instanz"
      width={580}
      footer={
        tab === 'empty' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Erstelle …' : 'Erstellen'}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${tab === 'empty' ? 'is-active' : ''}`}
          onClick={() => setTab('empty')}
        >
          Leere Instanz
        </button>
        <button
          className={`tab ${tab === 'modpack' ? 'is-active' : ''}`}
          onClick={() => setTab('modpack')}
        >
          Modpack
        </button>
      </div>

      {tab === 'empty' ? (
        <>
          <div className="form-row">
            <label>Name & Icon</label>
            <div className="row">
              <button
                className="instance-card__icon instance-card__icon--btn"
                title="Icon wählen"
                onClick={() => setPickingIcon(true)}
              >
                <InstanceIcon icon={icon} size={26} />
              </button>
              <Input value={name} onChange={setName} placeholder="Meine Instanz" full />
            </div>
          </div>
          {pickingIcon && (
            <IconPicker
              current={icon}
              onPick={(v) => {
                setIcon(v)
                setPickingIcon(false)
              }}
              onClose={() => setPickingIcon(false)}
            />
          )}

          <div className="form-row">
            <label>Minecraft-Version</label>
            {versions ? (
              <Select
                value={version}
                onChange={setVersion}
                options={versions.versions.map((v) => ({
                  value: v.id,
                  label: v.type === 'release' ? v.id : `${v.id} · ${v.type}`
                }))}
              />
            ) : (
              <span className="muted">Versionen werden geladen …</span>
            )}
          </div>

          <div className="form-row">
            <label>Mod-Loader</label>
            <div className="row">
              <Select
                value={loader}
                onChange={(v) => setLoader(v as '' | LoaderType)}
                options={LOADER_OPTS}
              />
              {loader &&
                (loaderLoading ? (
                  <Spinner />
                ) : (
                  <Select
                    value={loaderVersion}
                    onChange={setLoaderVersion}
                    options={[
                      { value: '', label: 'Neueste (empfohlen)' },
                      ...loaderVersions.map((lv) => ({
                        value: lv.version,
                        label:
                          lv.version +
                          (lv.recommended ? ' · empfohlen' : lv.stable ? ' · stabil' : '')
                      }))
                    ]}
                  />
                ))}
            </div>
          </div>

          <Button small variant="ghost" onClick={() => setShowSnapshots(!showSnapshots)}>
            Snapshots: {showSnapshots ? 'an' : 'aus'}
          </Button>

          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        </>
      ) : (
        <ModpackBrowser
          onInstalled={async () => {
            await refresh()
            onClose()
          }}
        />
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------

function ModpackBrowser({
  onInstalled
}: {
  onInstalled: () => void
}): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async (q: string): Promise<void> => {
    setSearching(true)
    setError(null)
    try {
      setResults(await window.api.invoke('modpacks:search', q))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    runSearch('')
  }, [])

  const installPack = async (hit: ModSearchHit): Promise<void> => {
    setBusyId(hit.projectId)
    setError(null)
    try {
      await window.api.invoke('modpacks:install', hit.projectId)
      onInstalled()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusyId(null)
    }
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row">
        <Input
          value={query}
          onChange={setQuery}
          onEnter={() => runSearch(query.trim())}
          placeholder="Modpacks durchsuchen (Modrinth) …"
          full
        />
        <Button onClick={() => runSearch(query.trim())} disabled={searching}>
          Suchen
        </Button>
      </div>
      {busyId && (
        <p className="muted">
          Modpack wird installiert … das kann je nach Größe etwas dauern.
        </p>
      )}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {searching ? (
        <div className="row">
          <Spinner /> <span className="muted">Suche …</span>
        </div>
      ) : (
        <ul className="mod-list" style={{ maxHeight: 360 }}>
          {results.map((hit) => (
            <li key={hit.projectId} className="mod-row">
              <ModIcon url={hit.iconUrl} />
              <div className="mod-row__info">
                <span className="mod-row__name">{hit.title}</span>
                <span className="mod-row__desc">{hit.description}</span>
              </div>
              <Button small onClick={() => installPack(hit)} disabled={busyId !== null}>
                {busyId === hit.projectId ? 'läuft …' : 'Anlegen'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ModIcon({ url }: { url?: string }): JSX.Element {
  if (url) return <img className="mod-row__icon" src={url} alt="" />
  return (
    <div className="mod-row__icon mod-row__icon--placeholder">
      <Icon name="package" size={22} />
    </div>
  )
}

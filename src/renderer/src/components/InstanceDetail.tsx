import { useEffect, useRef, useState } from 'react'
import type { InstalledMod, ModSearchHit } from '@shared/ipc'
import { useInstances } from '../store/instances'
import { Modal, Button, Chip, IconButton, Input, ProgressBar, Spinner } from './ui'
import Icon from './icons'
import { InstanceIcon, IconPicker } from './InstanceIcon'

const PHASE_LABEL: Record<string, string> = {
  minecraft: 'Minecraft',
  java: 'Java',
  loader: 'Loader',
  done: 'Fertig',
  error: 'Fehler'
}

export interface InstanceDetailProps {
  instanceId: string
  onClose: () => void
  onPlay: (id: string) => void
}

export default function InstanceDetail({
  instanceId,
  onClose,
  onPlay
}: InstanceDetailProps): JSX.Element | null {
  const {
    instances,
    progress,
    launchStatus,
    install,
    remove,
    duplicate,
    rename,
    setIcon,
    openFolder
  } = useInstances()

  const instance = instances.find((i) => i.id === instanceId) ?? null

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(instance?.name ?? '')
  const [picking, setPicking] = useState(false)

  // --- Mods ---
  const [installed, setInstalled] = useState<InstalledMod[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const loadInstalled = (): void => {
    window.api
      .invoke('mods:list', instanceId)
      .then(setInstalled)
      .catch(() => setInstalled([]))
  }

  useEffect(() => {
    loadInstalled()
    runSearch('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId])

  const runSearch = async (q: string): Promise<void> => {
    const id = ++reqId.current
    setSearching(true)
    setError(null)
    try {
      const hits = await window.api.invoke('mods:search', instanceId, q)
      if (id === reqId.current) setResults(hits)
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === reqId.current) setSearching(false)
    }
  }

  if (!instance) return null

  const prog = progress[instanceId]
  const installing = prog !== undefined && prog.phase !== 'done' && prog.phase !== 'error'
  const running =
    launchStatus[instanceId]?.state === 'launching' ||
    launchStatus[instanceId]?.state === 'running'
  const busy = installing || running

  const commitRename = (): void => {
    const t = draft.trim()
    if (t && t !== instance.name) rename(instance.id, t)
    setEditing(false)
  }

  const installMod = async (hit: ModSearchHit): Promise<void> => {
    setBusyId(hit.projectId)
    setError(null)
    try {
      setInstalled(await window.api.invoke('mods:install', instanceId, hit.projectId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }
  const toggle = async (mod: InstalledMod): Promise<void> => {
    setInstalled(
      await window.api.invoke('mods:setEnabled', instanceId, mod.fileName, !mod.enabled)
    )
  }
  const removeMod = async (mod: InstalledMod): Promise<void> => {
    setInstalled(await window.api.invoke('mods:remove', instanceId, mod.fileName))
  }
  const checkUpdates = async (): Promise<void> => {
    setChecking(true)
    try {
      setInstalled(await window.api.invoke('mods:checkUpdates', instanceId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
    }
  }
  const doUpdate = async (mod: InstalledMod): Promise<void> => {
    setUpdating(mod.fileName)
    try {
      setInstalled(await window.api.invoke('mods:update', instanceId, mod.fileName))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdating(null)
    }
  }

  const installedIds = new Set(installed.map((m) => m.projectId).filter(Boolean))

  return (
    <Modal open onClose={onClose} title={instance.name} width={680}>
      {/* Kopf: Icon + Name + Chips */}
      <div className="row" style={{ gap: 14, marginBottom: 14 }}>
        <button
          className="instance-card__icon instance-card__icon--btn"
          title="Icon ändern"
          onClick={() => setPicking(true)}
        >
          <InstanceIcon icon={instance.icon} size={30} />
        </button>
        {picking && (
          <IconPicker
            current={instance.icon}
            onPick={(icon) => {
              setIcon(instance.id, icon)
              setPicking(false)
            }}
            onClose={() => setPicking(false)}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div className="row">
              <Input value={draft} onChange={setDraft} onEnter={commitRename} />
              <Button small variant="primary" onClick={commitRename}>
                OK
              </Button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <strong style={{ fontSize: '1.1rem' }}>{instance.name}</strong>
              <IconButton title="Umbenennen" onClick={() => setEditing(true)}>
                <Icon name="edit" size={16} />
              </IconButton>
            </div>
          )}
          <div className="row" style={{ gap: 6, marginTop: 4 }}>
            <Chip>{instance.mcVersion}</Chip>
            {instance.loader && (
              <Chip>
                {instance.loader}
                {instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}
              </Chip>
            )}
            <Chip tone={instance.installed ? 'accent' : 'default'}>
              {instance.installed ? 'installiert' : 'nicht installiert'}
            </Chip>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="row" style={{ marginBottom: 8 }}>
        <Button variant="primary" disabled={busy} onClick={() => onPlay(instance.id)}>
          <Icon name={instance.installed ? 'play' : 'download'} size={16} />
          {installing
            ? 'Installiere …'
            : running
              ? 'Läuft …'
              : instance.installed
                ? 'Spielen'
                : 'Installieren & Spielen'}
        </Button>
        <Button small disabled={busy} onClick={() => install(instance.id)}>
          {instance.installed ? 'Reparieren' : 'Installieren'}
        </Button>
        <div className="spacer" />
        <IconButton title="Ordner öffnen" onClick={() => openFolder(instance.id)}>
          <Icon name="folder" size={17} />
        </IconButton>
        <IconButton title="Duplizieren" onClick={() => duplicate(instance.id)}>
          <Icon name="copy" size={17} />
        </IconButton>
        <IconButton
          title="Löschen"
          danger
          onClick={() => {
            remove(instance.id)
            onClose()
          }}
        >
          <Icon name="trash" size={17} />
        </IconButton>
      </div>

      {prog && prog.phase !== 'done' && (
        <div className="stack" style={{ gap: 5, marginBottom: 8 }}>
          <ProgressBar
            value={prog.phase === 'error' ? 1 : prog.progress}
            tone={prog.phase === 'error' ? 'danger' : 'accent'}
          />
          <span
            className="muted"
            style={{
              fontSize: '0.78rem',
              color: prog.phase === 'error' ? 'var(--danger)' : undefined
            }}
          >
            {prog.phase === 'error'
              ? `Fehler: ${prog.error ?? 'unbekannt'}`
              : `${PHASE_LABEL[prog.phase] ?? prog.phase} · ${Math.round(prog.progress * 100)}%`}
          </span>
        </div>
      )}

      {/* Mods */}
      <h3 style={{ marginTop: 14 }}>Mods</h3>
      {!instance.loader ? (
        <p className="muted">
          Diese Instanz ist Vanilla – Mods brauchen einen Loader (Fabric/Forge/Quilt).
        </p>
      ) : (
        <>
          <div className="row">
            <Input
              value={query}
              onChange={setQuery}
              onEnter={() => runSearch(query.trim())}
              placeholder="Mods suchen (Modrinth) …"
              full
            />
            <Button onClick={() => runSearch(query.trim())} disabled={searching}>
              Suchen
            </Button>
          </div>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          {searching ? (
            <div className="row" style={{ marginTop: 10 }}>
              <Spinner /> <span className="muted">Lädt …</span>
            </div>
          ) : (
            <ul
              className="mod-list"
              style={{ marginTop: 10, maxHeight: 240, overflowY: 'auto' }}
            >
              {results.map((hit) => {
                const already = installedIds.has(hit.projectId)
                return (
                  <li key={hit.projectId} className="mod-row">
                    {hit.iconUrl ? (
                      <img className="mod-row__icon" src={hit.iconUrl} alt="" />
                    ) : (
                      <div className="mod-row__icon mod-row__icon--placeholder">
                        <Icon name="package" size={20} />
                      </div>
                    )}
                    <div className="mod-row__info">
                      <span className="mod-row__name">{hit.title}</span>
                      <span className="mod-row__desc">{hit.description}</span>
                    </div>
                    <Button
                      small
                      variant={already ? 'ghost' : 'secondary'}
                      onClick={() => installMod(hit)}
                      disabled={busyId === hit.projectId || already}
                    >
                      {busyId === hit.projectId
                        ? 'läuft …'
                        : already
                          ? 'installiert ✓'
                          : 'Installieren'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
            <strong>Installiert ({installed.length})</strong>
            {installed.length > 0 && (
              <Button small variant="ghost" onClick={checkUpdates} disabled={checking}>
                {checking ? 'Prüfe …' : 'Nach Updates suchen'}
              </Button>
            )}
          </div>
          {installed.length === 0 ? (
            <p className="muted">Noch keine Mods installiert.</p>
          ) : (
            <ul className="mod-list" style={{ marginTop: 8 }}>
              {installed.map((mod) => (
                <li
                  key={mod.fileName}
                  className={`mod-row ${mod.enabled ? '' : 'is-disabled'}`}
                >
                  <div className="mod-row__info">
                    <span className="mod-row__name">{mod.name ?? mod.fileName}</span>
                    {mod.updateVersion && (
                      <span className="mod-update">↑ Update: {mod.updateVersion}</span>
                    )}
                  </div>
                  {mod.updateVersion && (
                    <Button
                      small
                      variant="primary"
                      onClick={() => doUpdate(mod)}
                      disabled={updating === mod.fileName}
                    >
                      {updating === mod.fileName ? 'läuft …' : 'Aktualisieren'}
                    </Button>
                  )}
                  {!mod.enabled && <Chip>aus</Chip>}
                  <Button small variant="ghost" onClick={() => toggle(mod)}>
                    {mod.enabled ? 'Aus' : 'An'}
                  </Button>
                  <Button small variant="danger" onClick={() => removeMod(mod)}>
                    Entfernen
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  )
}

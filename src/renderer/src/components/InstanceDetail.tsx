import { useState } from 'react'
import type { ContentKind } from '@shared/ipc'
import { useInstances } from '../store/instances'
import { Button, Chip, IconButton, Input, ProgressBar } from './ui'
import Icon from './icons'
import { InstanceIcon, IconPicker } from './InstanceIcon'
import ContentPanel, { type ContentApi } from './ContentPanel'

const PHASE_LABEL: Record<string, string> = {
  minecraft: 'Minecraft',
  java: 'Java',
  loader: 'Loader',
  done: 'Fertig',
  error: 'Fehler'
}

/** Inhaltstypen-Leiste (rechts). „soon“ = noch nicht verfügbar. */
const CONTENT_TYPES: { id: string; label: string; icon: string; soon?: boolean }[] = [
  { id: 'mods', label: 'Mods', icon: 'package' },
  { id: 'resourcepack', label: 'Ressourcenpakete', icon: 'design' },
  { id: 'shaderpack', label: 'Shader', icon: 'cube' },
  { id: 'datapack', label: 'Datapacks', icon: 'logs' },
  { id: 'worlds', label: 'Welten', icon: 'instances', soon: true }
]

/** Labels für die generischen (loader-freien) Inhalts-Panels. */
const PANEL_CONFIG: Record<
  ContentKind,
  { nounPlural: string; addLabel: string; searchPlaceholder: string }
> = {
  resourcepack: {
    nounPlural: 'Ressourcenpakete',
    addLabel: 'Ressourcenpaket hinzufügen',
    searchPlaceholder: 'Ressourcenpakete suchen (Modrinth) …'
  },
  shaderpack: {
    nounPlural: 'Shader',
    addLabel: 'Shader hinzufügen',
    searchPlaceholder: 'Shader suchen (Modrinth) …'
  },
  datapack: {
    nounPlural: 'Datapacks',
    addLabel: 'Datapack hinzufügen',
    searchPlaceholder: 'Datapacks suchen (Modrinth) …'
  }
}

/** „zuletzt gespielt“ kurz und auf Deutsch. */
function formatLastPlayed(ts?: number): string {
  if (!ts) return 'nie gespielt'
  const diff = Date.now() - ts
  const day = 86_400_000
  if (diff < 60_000) return 'gerade eben'
  if (diff < 3_600_000) return `vor ${Math.floor(diff / 60_000)} Min.`
  if (diff < day) return `vor ${Math.floor(diff / 3_600_000)} Std.`
  if (diff < 7 * day) return `vor ${Math.floor(diff / day)} Tg.`
  return new Date(ts).toLocaleDateString('de-DE')
}

export interface InstanceDetailProps {
  instanceId: string
  onClose: () => void
  onPlay: (id: string) => void
}

/**
 * Vollseiten-Detailansicht einer Instanz (Layout angelehnt an die
 * ProfileDetailView des noriskclient-Launchers): Kopf mit Icon, Name, Meta und
 * Aktionen, darunter der Inhaltsbereich mit rechter Inhaltstyp-Leiste. Mods und
 * Ressourcenpakete teilen sich das `ContentPanel`.
 */
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
  const [activeType, setActiveType] = useState('mods')

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

  const modsApi: ContentApi = {
    search: (q, offset) => window.api.invoke('mods:search', instanceId, q, offset),
    list: () => window.api.invoke('mods:list', instanceId),
    install: (pid) => window.api.invoke('mods:install', instanceId, pid),
    remove: (fn) => window.api.invoke('mods:remove', instanceId, fn),
    toggle: (fn, en) => window.api.invoke('mods:setEnabled', instanceId, fn, en),
    checkUpdates: () => window.api.invoke('mods:checkUpdates', instanceId),
    update: (fn) => window.api.invoke('mods:update', instanceId, fn)
  }
  const contentApi = (kind: ContentKind): ContentApi => ({
    search: (q, offset) => window.api.invoke('content:search', instanceId, kind, q, offset),
    list: () => window.api.invoke('content:list', instanceId, kind),
    install: (pid) => window.api.invoke('content:install', instanceId, kind, pid),
    remove: (fn) => window.api.invoke('content:remove', instanceId, kind, fn),
    checkUpdates: () => window.api.invoke('content:checkUpdates', instanceId, kind),
    update: (fn) => window.api.invoke('content:update', instanceId, kind, fn)
  })

  const playLabel = installing
    ? 'Installiere …'
    : running
      ? 'Läuft …'
      : instance.installed
        ? 'Spielen'
        : 'Installieren & Spielen'

  return (
    <div className="detail">
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

      {/* Kopfzeile */}
      <div className="detail__head">
        <button className="detail__back" onClick={onClose} title="Zurück">
          ‹ Zurück
        </button>

        <div className="detail__title-row">
          <button
            className="instance-card__icon instance-card__icon--btn detail__icon"
            title="Icon ändern"
            onClick={() => setPicking(true)}
          >
            <InstanceIcon icon={instance.icon} size={40} />
          </button>

          <div className="detail__headinfo">
            {editing ? (
              <div className="row">
                <Input value={draft} onChange={setDraft} onEnter={commitRename} />
                <Button small variant="primary" onClick={commitRename}>
                  OK
                </Button>
              </div>
            ) : (
              <div className="row" style={{ gap: 8 }}>
                <h1 className="detail__name">{instance.name}</h1>
                <IconButton title="Umbenennen" onClick={() => setEditing(true)}>
                  <Icon name="edit" size={16} />
                </IconButton>
              </div>
            )}
            <div className="detail__meta">
              <span>{instance.mcVersion}</span>
              <span className="instance-row__sep" />
              <span>
                {instance.loader
                  ? `${instance.loader}${instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}`
                  : 'Vanilla'}
              </span>
              <span className="instance-row__sep" />
              <span>{formatLastPlayed(instance.lastPlayed)}</span>
              <Chip tone={instance.installed ? 'accent' : 'default'}>
                {instance.installed ? 'installiert' : 'nicht installiert'}
              </Chip>
            </div>
          </div>

          <div className="detail__actions">
            <Button variant="primary" disabled={busy} onClick={() => onPlay(instance.id)}>
              <Icon name={instance.installed ? 'play' : 'download'} size={16} />
              {playLabel}
            </Button>
            <Button small disabled={busy} onClick={() => install(instance.id)}>
              {instance.installed ? 'Reparieren' : 'Installieren'}
            </Button>
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
        </div>

        {prog && prog.phase !== 'done' && (
          <div className="detail__progress">
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
      </div>

      <div className="detail__divider" />

      {/* Inhalt + Inhaltstyp-Leiste */}
      <div className="detail__body">
        <div className="detail__content">
          {activeType === 'mods' ? (
            !instance.loader ? (
              <p className="muted">
                Diese Instanz ist Vanilla – Mods brauchen einen Loader (Fabric/Forge/Quilt).
                Ressourcenpakete, Shader und Datapacks funktionieren trotzdem.
              </p>
            ) : (
              <ContentPanel
                key={`${instanceId}:mods`}
                api={modsApi}
                nounPlural="Mods"
                addLabel="Mods hinzufügen"
                searchPlaceholder="Mods suchen (Modrinth) …"
              />
            )
          ) : PANEL_CONFIG[activeType as ContentKind] ? (
            <ContentPanel
              key={`${instanceId}:${activeType}`}
              api={contentApi(activeType as ContentKind)}
              {...PANEL_CONFIG[activeType as ContentKind]}
            />
          ) : (
            <div className="empty">Dieser Bereich folgt in einer späteren Version.</div>
          )}
        </div>

        <aside className="detail__cside">
          <div className="detail__cside-title">Inhalte</div>
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.id}
              className={`content-nav ${activeType === c.id ? 'is-active' : ''} ${
                c.soon ? 'is-soon' : ''
              }`}
              disabled={c.soon}
              onClick={() => !c.soon && setActiveType(c.id)}
            >
              <Icon name={c.icon} size={18} />
              <span>{c.label}</span>
              {c.soon && <span className="content-nav__soon">bald</span>}
            </button>
          ))}
        </aside>
      </div>
    </div>
  )
}

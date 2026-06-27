import { useEffect, useRef, useState } from 'react'
import type { InstalledMod, ModSearchHit } from '@shared/ipc'
import { useInstances } from '../store/instances'
import { Button, Card, Chip, Input, Select, Spinner } from '../components/ui'
import { ModIcon } from './Instances'

export default function Mods(): JSX.Element {
  const { instances, loaded, refresh } = useInstances()

  const [instanceId, setInstanceId] = useState('')
  const [source, setSource] = useState('modrinth')
  const [installed, setInstalled] = useState<InstalledMod[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    if (!loaded) refresh()
  }, [loaded, refresh])

  useEffect(() => {
    if (!instanceId && instances.length > 0) setInstanceId(instances[0].id)
  }, [instances, instanceId])

  const current = instances.find((i) => i.id === instanceId) ?? null

  const loadInstalled = (id: string): void => {
    window.api
      .invoke('mods:list', id)
      .then(setInstalled)
      .catch(() => setInstalled([]))
  }

  // Beim Instanzwechsel: installierte Mods + Standard-„beliebt"-Liste laden.
  useEffect(() => {
    if (!instanceId) return
    loadInstalled(instanceId)
    runSearch(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId])

  const runSearch = async (q: string): Promise<void> => {
    if (!instanceId) return
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

  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const checkUpdates = async (): Promise<void> => {
    if (!instanceId) return
    setChecking(true)
    setError(null)
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
    setError(null)
    try {
      setInstalled(await window.api.invoke('mods:update', instanceId, mod.fileName))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdating(null)
    }
  }

  if (instances.length === 0) {
    return (
      <div className="stack">
        <h1>Mods</h1>
        <div className="empty">Lege zuerst unter „Instanzen“ eine Instanz an.</div>
      </div>
    )
  }

  const installedNames = new Set(installed.map((m) => m.projectId).filter(Boolean))

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Mods</h1>
        <div className="row">
          <Select
            value={source}
            onChange={setSource}
            options={[{ value: 'modrinth', label: 'Quelle: Modrinth' }]}
          />
          <Select
            value={instanceId}
            onChange={setInstanceId}
            options={instances.map((i) => ({
              value: i.id,
              label: `${i.name} · ${i.mcVersion}${i.loader ? ` · ${i.loader}` : ''}`
            }))}
          />
        </div>
      </div>

      {current && !current.loader && (
        <Card>
          <span className="muted">
            Diese Instanz ist Vanilla – Mods brauchen einen Loader (Fabric/Forge/Quilt).
          </span>
        </Card>
      )}

      <div className="row">
        <Input
          value={query}
          onChange={setQuery}
          onEnter={() => runSearch(query.trim())}
          placeholder="Mods durchsuchen … (z. B. Sodium, JEI)"
          full
        />
        <Button onClick={() => runSearch(query.trim())} disabled={searching}>
          Suchen
        </Button>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {searching ? (
        <div className="row">
          <Spinner /> <span className="muted">Lädt …</span>
        </div>
      ) : (
        <ul className="mod-list">
          {results.map((hit) => {
            const already = installedNames.has(hit.projectId)
            return (
              <li key={hit.projectId} className="mod-row">
                <ModIcon url={hit.iconUrl} />
                <div className="mod-row__info">
                  <span className="mod-row__name">{hit.title}</span>
                  <span className="mod-row__desc">{hit.description}</span>
                  <span className="mod-row__by">
                    von {hit.author} · {hit.downloads.toLocaleString('de-DE')} Downloads
                  </span>
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
                      : '⤓ Installieren'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Card>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 className="card__title" style={{ margin: 0 }}>
            Installierte Mods ({installed.length})
          </h3>
          {installed.length > 0 && (
            <Button small variant="ghost" onClick={checkUpdates} disabled={checking}>
              {checking ? 'Prüfe …' : 'Nach Updates suchen'}
            </Button>
          )}
        </div>
        {installed.length === 0 ? (
          <span className="muted">Noch keine Mods installiert.</span>
        ) : (
          <ul className="mod-list">
            {installed.map((mod) => (
              <li
                key={mod.fileName}
                className={`mod-row ${mod.enabled ? '' : 'is-disabled'}`}
              >
                <div className="mod-row__info">
                  <span className="mod-row__name">{mod.name ?? mod.fileName}</span>
                  <span className="mod-row__by">
                    {mod.version ? `${mod.version} · ` : ''}
                    {(mod.size / 1024 / 1024).toFixed(1)} MB
                  </span>
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
                {!mod.enabled && <Chip>deaktiviert</Chip>}
                <Button small variant="ghost" onClick={() => toggle(mod)}>
                  {mod.enabled ? 'Deaktivieren' : 'Aktivieren'}
                </Button>
                <Button small variant="danger" onClick={() => removeMod(mod)}>
                  Entfernen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

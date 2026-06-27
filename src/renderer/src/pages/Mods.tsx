import { useEffect, useState } from 'react'
import type { InstalledMod, ModSearchHit } from '@shared/ipc'
import { useInstances } from '../store/instances'
import DoodleCard from '../components/DoodleCard'
import { WiredButton, WiredCombo, WiredInput, WiredItem } from '../components/wired'

/**
 * Mod-Verwaltung je Instanz (M7, Modrinth): Suche/Installieren sowie
 * Aktivieren/Deaktivieren/Entfernen installierter Mods.
 */
export default function Mods(): JSX.Element {
  const { instances, loaded, refresh } = useInstances()

  const [instanceId, setInstanceId] = useState('')
  const [installed, setInstalled] = useState<InstalledMod[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) refresh()
  }, [loaded, refresh])

  useEffect(() => {
    if (!instanceId && instances.length > 0) setInstanceId(instances[0].id)
  }, [instances, instanceId])

  const current = instances.find((i) => i.id === instanceId) ?? null

  // Installierte Mods laden, sobald die Instanz wechselt.
  useEffect(() => {
    if (!instanceId) return
    let cancelled = false
    window.api
      .invoke('mods:list', instanceId)
      .then((list) => !cancelled && setInstalled(list))
      .catch(() => !cancelled && setInstalled([]))
    return () => {
      cancelled = true
    }
  }, [instanceId])

  const handleSearch = async (): Promise<void> => {
    if (!instanceId || !query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await window.api.invoke('mods:search', instanceId, query.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearching(false)
    }
  }

  const handleInstall = async (hit: ModSearchHit): Promise<void> => {
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

  const remove = async (mod: InstalledMod): Promise<void> => {
    setInstalled(await window.api.invoke('mods:remove', instanceId, mod.fileName))
  }

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <h1>Mods</h1>

      {instances.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>
          Lege zuerst unter „Instanzen“ eine Instanz an.
        </p>
      ) : (
        <>
          <DoodleCard title="Instanz">
            <div className="row">
              <WiredCombo
                value={instanceId}
                onSelect={setInstanceId}
                style={{ minWidth: 240 }}
              >
                {instances.map((i) => (
                  <WiredItem key={i.id} value={i.id}>
                    {i.name} · {i.mcVersion}
                    {i.loader ? ` · ${i.loader}` : ''}
                  </WiredItem>
                ))}
              </WiredCombo>
              {current && !current.loader && (
                <span style={{ color: 'var(--ink-faint)', fontSize: '0.85rem' }}>
                  Vanilla-Instanz – Mods brauchen einen Loader.
                </span>
              )}
            </div>
          </DoodleCard>

          <DoodleCard title="Mods suchen (Modrinth)">
            <div className="row">
              <WiredInput
                value={query}
                placeholder="z. B. Sodium, JEI …"
                onValueChange={setQuery}
              />
              <WiredButton elevation={2} onClick={handleSearch} disabled={searching}>
                {searching ? 'Suche …' : '🔍 Suchen'}
              </WiredButton>
            </div>
            {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}

            {results.length > 0 && (
              <ul className="mod-list" style={{ marginTop: 12 }}>
                {results.map((hit) => (
                  <li key={hit.projectId} className="mod-row">
                    {hit.iconUrl && (
                      <img className="mod-row__icon" src={hit.iconUrl} alt="" />
                    )}
                    <div className="mod-row__info">
                      <span className="mod-row__name">{hit.title}</span>
                      <span className="mod-row__desc">{hit.description}</span>
                      <span style={{ color: 'var(--ink-faint)', fontSize: '0.8rem' }}>
                        von {hit.author} · {hit.downloads.toLocaleString('de-DE')} Downloads
                      </span>
                    </div>
                    <WiredButton
                      onClick={() => handleInstall(hit)}
                      disabled={busyId === hit.projectId}
                    >
                      {busyId === hit.projectId ? 'läuft …' : '⤓ Installieren'}
                    </WiredButton>
                  </li>
                ))}
              </ul>
            )}
          </DoodleCard>

          <DoodleCard title={`Installierte Mods (${installed.length})`}>
            {installed.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)' }}>Noch keine Mods installiert.</p>
            ) : (
              <ul className="mod-list">
                {installed.map((mod) => (
                  <li
                    key={mod.fileName}
                    className={`mod-row ${mod.enabled ? '' : 'is-disabled'}`}
                  >
                    <div className="mod-row__info">
                      <span className="mod-row__name">{mod.name ?? mod.fileName}</span>
                      <span className="mod-row__desc">
                        {mod.version ? `${mod.version} · ` : ''}
                        {(mod.size / 1024 / 1024).toFixed(1)} MB
                        {mod.enabled ? '' : ' · deaktiviert'}
                      </span>
                    </div>
                    <div className="row">
                      <WiredButton onClick={() => toggle(mod)}>
                        {mod.enabled ? 'Deaktivieren' : 'Aktivieren'}
                      </WiredButton>
                      <WiredButton onClick={() => remove(mod)}>Entfernen</WiredButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DoodleCard>
        </>
      )}
    </div>
  )
}

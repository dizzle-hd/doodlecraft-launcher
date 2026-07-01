import { useEffect, useRef, useState } from 'react'
import { MOD_SEARCH_PAGE_SIZE, type InstalledMod, type ModSearchHit } from '@shared/ipc'
import { Button, Chip, Input, Modal, Spinner } from './ui'
import Icon from './icons'

/** Datenzugriff für ein Inhalts-Panel – vom Parent an die IPC-Kanäle gebunden. */
export interface ContentApi {
  /** Sucht Treffer ab `offset` (Seitengröße = MOD_SEARCH_PAGE_SIZE). */
  search: (query: string, offset: number) => Promise<ModSearchHit[]>
  list: () => Promise<InstalledMod[]>
  install: (projectId: string) => Promise<InstalledMod[]>
  remove: (fileName: string) => Promise<InstalledMod[]>
  /** Optional – nur Mods lassen sich aktivieren/deaktivieren. */
  toggle?: (fileName: string, enabled: boolean) => Promise<InstalledMod[]>
  checkUpdates: () => Promise<InstalledMod[]>
  update: (fileName: string) => Promise<InstalledMod[]>
}

export interface ContentPanelProps {
  api: ContentApi
  /** Plural-Bezeichnung (z. B. „Mods“, „Ressourcenpakete“). */
  nounPlural: string
  /** Button-Text zum Öffnen des Hinzufügen-Popups. */
  addLabel: string
  searchPlaceholder: string
}

/**
 * Verwaltet installierte Inhalte einer Instanz (Mods oder Ressourcenpakete):
 * Übersicht der installierten Einträge + ein Popup zum Suchen/Installieren über
 * Modrinth (mit seitenweisem Nachladen beim Runterscrollen). Die konkreten
 * IPC-Aufrufe kommen über `api` herein.
 */
export default function ContentPanel({
  api,
  nounPlural,
  addLabel,
  searchPlaceholder
}: ContentPanelProps): JSX.Element {
  const [installed, setInstalled] = useState<InstalledMod[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModSearchHit[]>([])
  const [activeQuery, setActiveQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const reqId = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    api.list().then(setInstalled).catch(() => setInstalled([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Neue Suche (erste Seite). */
  const runSearch = async (q: string): Promise<void> => {
    const id = ++reqId.current
    setSearching(true)
    setError(null)
    setActiveQuery(q)
    try {
      const hits = await api.search(q, 0)
      if (id !== reqId.current) return
      setResults(hits)
      setHasMore(hits.length === MOD_SEARCH_PAGE_SIZE)
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === reqId.current) setSearching(false)
    }
  }

  /** Nächste Seite anhängen. */
  const loadMore = async (): Promise<void> => {
    if (loadingMore || searching || !hasMore) return
    const id = reqId.current
    setLoadingMore(true)
    try {
      const hits = await api.search(activeQuery, results.length)
      if (id !== reqId.current) return
      // Dubletten anhand der projectId vermeiden.
      setResults((prev) => {
        const seen = new Set(prev.map((h) => h.projectId))
        return [...prev, ...hits.filter((h) => !seen.has(h.projectId))]
      })
      setHasMore(hits.length === MOD_SEARCH_PAGE_SIZE)
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === reqId.current) setLoadingMore(false)
    }
  }

  // Immer die aktuellste loadMore-Variante für den Scroll-Listener bereithalten.
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  // Infinite-Scroll: nachladen, wenn das Ende der Liste in Sicht kommt.
  useEffect(() => {
    if (!addOpen) return
    const scroller = listRef.current?.closest('.modal__body') as HTMLElement | null
    if (!scroller) return
    const onScroll = (): void => {
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 160) {
        loadMoreRef.current()
      }
    }
    scroller.addEventListener('scroll', onScroll)
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [addOpen, searching])

  const openAdd = (): void => {
    setAddOpen(true)
    if (results.length === 0) runSearch('')
  }

  const installOne = async (hit: ModSearchHit): Promise<void> => {
    setBusyId(hit.projectId)
    setError(null)
    try {
      setInstalled(await api.install(hit.projectId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }
  const toggleOne = async (mod: InstalledMod): Promise<void> => {
    if (!api.toggle) return
    setInstalled(await api.toggle(mod.fileName, !mod.enabled))
  }
  const removeOne = async (mod: InstalledMod): Promise<void> => {
    setInstalled(await api.remove(mod.fileName))
  }
  const checkUpdates = async (): Promise<void> => {
    setChecking(true)
    try {
      setInstalled(await api.checkUpdates())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
    }
  }
  const updateOne = async (mod: InstalledMod): Promise<void> => {
    setUpdating(mod.fileName)
    try {
      setInstalled(await api.update(mod.fileName))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdating(null)
    }
  }

  const installedIds = new Set(installed.map((m) => m.projectId).filter(Boolean))

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Installiert ({installed.length})</strong>
        <div className="row" style={{ gap: 8 }}>
          {installed.length > 0 && (
            <Button small variant="ghost" onClick={checkUpdates} disabled={checking}>
              {checking ? 'Prüfe …' : 'Nach Updates suchen'}
            </Button>
          )}
          <Button small variant="primary" onClick={openAdd}>
            <Icon name="plus" size={15} /> {addLabel}
          </Button>
        </div>
      </div>
      {error && !addOpen && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {installed.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>
          Noch nichts installiert. Über „＋ {addLabel}“ kannst du {nounPlural} von
          Modrinth installieren.
        </p>
      ) : (
        <ul className="mod-list" style={{ marginTop: 8 }}>
          {installed.map((mod) => (
            <li key={mod.fileName} className={`mod-row ${mod.enabled ? '' : 'is-disabled'}`}>
              {mod.iconUrl ? (
                <img className="mod-row__icon" src={mod.iconUrl} alt="" />
              ) : (
                <div className="mod-row__icon mod-row__icon--placeholder">
                  <Icon name="package" size={20} />
                </div>
              )}
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
                  onClick={() => updateOne(mod)}
                  disabled={updating === mod.fileName}
                >
                  {updating === mod.fileName ? 'läuft …' : 'Aktualisieren'}
                </Button>
              )}
              {api.toggle && !mod.enabled && <Chip>aus</Chip>}
              {api.toggle && (
                <Button small variant="ghost" onClick={() => toggleOne(mod)}>
                  {mod.enabled ? 'Aus' : 'An'}
                </Button>
              )}
              <Button small variant="danger" onClick={() => removeOne(mod)}>
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      )}

      {addOpen && (
        <Modal open onClose={() => setAddOpen(false)} title={addLabel} width={620} fullHeight>
          <div className="row">
            <Input
              value={query}
              onChange={setQuery}
              onEnter={() => runSearch(query.trim())}
              placeholder={searchPlaceholder}
              full
            />
            <Button variant="primary" onClick={() => runSearch(query.trim())} disabled={searching}>
              Suchen
            </Button>
          </div>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          {searching ? (
            <div className="row" style={{ marginTop: 12 }}>
              <Spinner /> <span className="muted">Lädt …</span>
            </div>
          ) : (
            <>
              <ul ref={listRef} className="mod-list" style={{ marginTop: 12 }}>
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
                        onClick={() => installOne(hit)}
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

              {results.length === 0 && (
                <p className="muted" style={{ marginTop: 12 }}>
                  Keine Treffer.
                </p>
              )}

              {loadingMore && (
                <div className="row" style={{ justifyContent: 'center', padding: '12px 0' }}>
                  <Spinner /> <span className="muted">Mehr laden …</span>
                </div>
              )}
              {!loadingMore && hasMore && (
                <div className="row" style={{ justifyContent: 'center', padding: '8px 0 4px' }}>
                  <Button small variant="ghost" onClick={loadMore}>
                    Mehr laden
                  </Button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  )
}

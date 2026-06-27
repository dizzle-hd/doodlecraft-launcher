import { useEffect, useRef, useState } from 'react'
import type { LogChunk } from '@shared/ipc'
import { useInstances } from '../store/instances'
import DoodleCard from '../components/DoodleCard'
import { WiredButton, WiredCombo, WiredItem } from '../components/wired'

/**
 * Logs-Ansicht: zeigt die stdout/stderr-Ausgabe des zuletzt gestarteten
 * Spielprozesses je Instanz. Backfill aus dem Main-Puffer + Live-Updates.
 */
export default function Logs(): JSX.Element {
  const { instances, loaded, refresh, launchStatus } = useInstances()

  const [instanceId, setInstanceId] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const preRef = useRef<HTMLPreElement>(null)
  // Aktuelle Instanz-ID für den Event-Handler ohne Re-Subscribe.
  const activeId = useRef('')

  useEffect(() => {
    if (!loaded) refresh()
  }, [loaded, refresh])

  useEffect(() => {
    if (!instanceId && instances.length > 0) setInstanceId(instances[0].id)
  }, [instances, instanceId])

  // Backfill beim Instanzwechsel.
  useEffect(() => {
    activeId.current = instanceId
    if (!instanceId) {
      setLines([])
      return
    }
    let cancelled = false
    window.api
      .invoke('logs:get', instanceId)
      .then((l) => !cancelled && setLines(l))
      .catch(() => !cancelled && setLines([]))
    return () => {
      cancelled = true
    }
  }, [instanceId])

  // Live-Updates abonnieren (nur einmal).
  useEffect(() => {
    const handler = (chunk: LogChunk): void => {
      if (chunk.instanceId !== activeId.current) return
      setLines((prev) => {
        const next = [...prev, ...chunk.lines]
        return next.length > 5000 ? next.slice(next.length - 5000) : next
      })
    }
    return window.api.on('launch:log', handler)
  }, [])

  // Autoscroll ans Ende.
  useEffect(() => {
    if (autoScroll && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [lines, autoScroll])

  const clear = async (): Promise<void> => {
    if (!instanceId) return
    await window.api.invoke('logs:clear', instanceId)
    setLines([])
  }

  const status = instanceId ? launchStatus[instanceId]?.state : undefined

  return (
    <div className="stack" style={{ maxWidth: 920 }}>
      <h1>Logs</h1>

      {instances.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>
          Lege zuerst unter „Instanzen“ eine Instanz an und starte sie.
        </p>
      ) : (
        <DoodleCard title="Spielausgabe">
          <div className="row">
            <WiredCombo
              value={instanceId}
              onSelect={setInstanceId}
              style={{ minWidth: 240 }}
            >
              {instances.map((i) => (
                <WiredItem key={i.id} value={i.id}>
                  {i.name} · {i.mcVersion}
                </WiredItem>
              ))}
            </WiredCombo>
            {status && <span className="doodle-chip">{status}</span>}
            <WiredButton onClick={() => setAutoScroll((v) => !v)}>
              Autoscroll: {autoScroll ? 'an' : 'aus'}
            </WiredButton>
            <WiredButton onClick={clear}>Leeren</WiredButton>
          </div>

          <pre ref={preRef} className="log-view">
            {lines.length === 0 ? 'Noch keine Ausgabe. Starte die Instanz über „Spielen“.' : lines.join('\n')}
          </pre>
        </DoodleCard>
      )}
    </div>
  )
}

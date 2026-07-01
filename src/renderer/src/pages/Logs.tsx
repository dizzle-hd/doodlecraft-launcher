import { useEffect, useRef, useState } from 'react'
import type { LogChunk } from '@shared/ipc'
import { useInstances } from '../store/instances'
import { Button, Card, Chip, Select } from '../components/ui'

export default function Logs(): JSX.Element {
  const { instances, loaded, refresh, launchStatus } = useInstances()

  const [instanceId, setInstanceId] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const preRef = useRef<HTMLPreElement>(null)
  const activeId = useRef('')

  useEffect(() => {
    if (!loaded) refresh()
  }, [loaded, refresh])

  useEffect(() => {
    if (!instanceId && instances.length > 0) setInstanceId(instances[0].id)
  }, [instances, instanceId])

  // Bevorzugt die gerade laufende/startende Instanz anzeigen.
  useEffect(() => {
    const runningId = Object.keys(launchStatus).find(
      (id) =>
        launchStatus[id]?.state === 'launching' || launchStatus[id]?.state === 'running'
    )
    if (runningId && runningId !== instanceId) setInstanceId(runningId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchStatus])

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

  const current = instanceId ? launchStatus[instanceId] : undefined
  const status = current?.state
  const statusError =
    current?.error ??
    (current?.state === 'error' ? 'Start fehlgeschlagen (kein Detail).' : undefined)

  if (instances.length === 0) {
    return (
      <div className="stack">
        <h1>Logs</h1>
        <div className="empty">Lege zuerst unter „Instanzen“ eine Instanz an.</div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Logs</h1>
      </div>
      <Card>
        <div className="row" style={{ marginBottom: 12 }}>
          <Select
            value={instanceId}
            onChange={setInstanceId}
            options={instances.map((i) => ({
              value: i.id,
              label: `${i.name} · ${i.mcVersion}`
            }))}
          />
          {status && <Chip>{status}</Chip>}
          <div className="spacer" />
          <Button small onClick={() => setAutoScroll((v) => !v)}>
            Autoscroll: {autoScroll ? 'an' : 'aus'}
          </Button>
          <Button small variant="ghost" onClick={clear}>
            Leeren
          </Button>
        </div>
        {statusError && (
          <p
            style={{
              margin: '0 0 12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: '0.88rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {statusError}
          </p>
        )}
        <pre ref={preRef} className="log-view">
          {lines.length === 0
            ? 'Noch keine Ausgabe. Starte die Instanz über „Spielen".'
            : lines.join('\n')}
        </pre>
      </Card>
    </div>
  )
}

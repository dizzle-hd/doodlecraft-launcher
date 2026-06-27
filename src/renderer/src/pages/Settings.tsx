import { useEffect, useState } from 'react'
import type { LauncherSettings } from '@shared/ipc'
import { Button, Card, Input } from '../components/ui'

const MEMORY_STEPS = [2048, 3072, 4096, 6144, 8192, 12288, 16384]

export default function Settings(): JSX.Element {
  const [settings, setSettings] = useState<LauncherSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.invoke('settings:get').then(setSettings)
  }, [])

  const update = async (patch: Partial<LauncherSettings>): Promise<void> => {
    const next = await window.api.invoke('settings:update', patch)
    setSettings(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  if (!settings) {
    return (
      <div className="stack">
        <h1>Einstellungen</h1>
        <p className="muted">Wird geladen …</p>
      </div>
    )
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <div>
          <h1>Einstellungen</h1>
          <p className="page-sub">Arbeitsspeicher, Java und Versionen.</p>
        </div>
        {saved && <span style={{ color: 'var(--accent)' }}>Gespeichert ✓</span>}
      </div>

      <Card>
        <h3 className="card__title">Arbeitsspeicher</h3>
        <p className="muted" style={{ marginTop: -6 }}>
          Maximaler Java-Heap (-Xmx) für das Spiel.
        </p>
        <div className="row">
          {MEMORY_STEPS.map((mb) => (
            <Button
              key={mb}
              small
              variant={settings.maxMemoryMb === mb ? 'primary' : 'secondary'}
              onClick={() => update({ maxMemoryMb: mb })}
            >
              {mb % 1024 === 0 ? `${mb / 1024} GB` : `${mb} MB`}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="card__title">Java</h3>
        <p className="muted" style={{ marginTop: -6 }}>
          Leer lassen, um automatisch die passende Java-Runtime je Instanz zu
          beschaffen. Sonst der volle Pfad zur java-Binary.
        </p>
        <div className="row">
          <Input
            value={settings.javaPath}
            placeholder="z. B. C:\Program Files\Java\…\bin\java.exe"
            onChange={(v) => setSettings({ ...settings, javaPath: v })}
            style={{ minWidth: 360 }}
          />
          <Button onClick={() => update({ javaPath: settings.javaPath })}>
            Speichern
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="card__title">Versionen</h3>
        <Button onClick={() => update({ showSnapshots: !settings.showSnapshots })}>
          Snapshots anzeigen: {settings.showSnapshots ? 'an' : 'aus'}
        </Button>
      </Card>
    </div>
  )
}

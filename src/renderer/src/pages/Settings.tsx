import { useEffect, useState } from 'react'
import type { LauncherSettings } from '@shared/ipc'
import DoodleCard from '../components/DoodleCard'
import { WiredButton, WiredInput } from '../components/wired'

const MEMORY_STEPS = [2048, 3072, 4096, 6144, 8192, 12288, 16384]

/** Einstellungen: RAM, optionaler Java-Pfad, Snapshots. */
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
        <p style={{ color: 'var(--ink-soft)' }}>Wird geladen …</p>
      </div>
    )
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Einstellungen</h1>

      <DoodleCard title="Arbeitsspeicher">
        <p style={{ color: 'var(--ink-soft)', marginTop: -4, fontSize: '0.9rem' }}>
          Maximaler Java-Heap (-Xmx) für das Spiel.
        </p>
        <div className="row">
          {MEMORY_STEPS.map((mb) => (
            <WiredButton
              key={mb}
              elevation={settings.maxMemoryMb === mb ? 3 : 1}
              onClick={() => update({ maxMemoryMb: mb })}
            >
              {mb % 1024 === 0 ? `${mb / 1024} GB` : `${mb} MB`}
            </WiredButton>
          ))}
        </div>
        <p style={{ marginTop: 8 }}>
          Aktuell: <strong>{(settings.maxMemoryMb / 1024).toFixed(1)} GB</strong>
        </p>
      </DoodleCard>

      <DoodleCard title="Java">
        <p style={{ color: 'var(--ink-soft)', marginTop: -4, fontSize: '0.9rem' }}>
          Leer lassen, um automatisch die passende Java-Runtime je Instanz zu
          beschaffen. Sonst der volle Pfad zur java-Binary.
        </p>
        <div className="row">
          <WiredInput
            value={settings.javaPath}
            placeholder="z. B. C:\\Program Files\\Java\\...\\bin\\java.exe"
            onValueChange={(v) => setSettings({ ...settings, javaPath: v })}
            style={{ minWidth: 360 }}
          />
          <WiredButton onClick={() => update({ javaPath: settings.javaPath })}>
            Speichern
          </WiredButton>
        </div>
      </DoodleCard>

      <DoodleCard title="Versionen">
        <div className="row">
          <WiredButton onClick={() => update({ showSnapshots: !settings.showSnapshots })}>
            Snapshots anzeigen: {settings.showSnapshots ? 'an' : 'aus'}
          </WiredButton>
        </div>
      </DoodleCard>

      {saved && <p style={{ color: 'var(--accent-deep)' }}>Gespeichert ✓</p>}
    </div>
  )
}

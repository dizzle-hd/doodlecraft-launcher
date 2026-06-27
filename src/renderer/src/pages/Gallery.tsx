import { useEffect, useState } from 'react'
import DoodleCard from '../components/DoodleCard'
import RoughProgressBar from '../components/RoughProgressBar'
import {
  WiredButton,
  WiredInput,
  WiredCombo,
  WiredItem
} from '../components/wired'
import type { AppInfo } from '@shared/ipc'

/**
 * Demo-Galerie (M2): zeigt alle Drawing-Style-Bausteine an einem Ort und
 * dient gleichzeitig als Smoke-Test der IPC-Bridge.
 */
export default function Gallery(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [progress, setProgress] = useState(0.35)
  const [name, setName] = useState('Steve')

  useEffect(() => {
    window.api.invoke('app:getInfo').then(setInfo)
  }, [])

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1>Design-System</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: -8 }}>
        Handgezeichnete Bausteine für den Launcher (Meilenstein 2).
      </p>

      <DoodleCard title="Buttons">
        <div className="row">
          <WiredButton elevation={2} onClick={() => setProgress((p) => Math.min(1, p + 0.15))}>
            Fortschritt +
          </WiredButton>
          <WiredButton onClick={() => setProgress((p) => Math.max(0, p - 0.15))}>
            Fortschritt −
          </WiredButton>
          <WiredButton disabled>Deaktiviert</WiredButton>
          <span className="doodle-chip">Chip</span>
        </div>
      </DoodleCard>

      <DoodleCard title="Fortschritt (RoughJS)">
        <div className="stack">
          <RoughProgressBar value={progress} label={`${Math.round(progress * 100)} %`} />
          <RoughProgressBar value={undefined} label="lädt …" color="var(--accent-2)" />
        </div>
      </DoodleCard>

      <DoodleCard title="Eingaben">
        <div className="row">
          <WiredInput value={name} placeholder="Spielername" onValueChange={setName} />
          <WiredCombo value="release" onSelect={(v) => console.log('version:', v)}>
            <WiredItem value="release">Release</WiredItem>
            <WiredItem value="snapshot">Snapshot</WiredItem>
          </WiredCombo>
        </div>
        <p style={{ marginTop: 12 }}>Hallo, {name}!</p>
      </DoodleCard>

      <DoodleCard title="IPC-Status">
        {info ? (
          <ul style={{ margin: 0, lineHeight: 1.8 }}>
            <li>App: {info.appVersion}</li>
            <li>Electron: {info.electronVersion}</li>
            <li>Plattform: {info.platform}</li>
          </ul>
        ) : (
          <p>Lade …</p>
        )}
      </DoodleCard>
    </div>
  )
}

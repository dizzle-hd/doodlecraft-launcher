import { useRef } from 'react'
import { Modal, Button } from './ui'
import Icon from './icons'

const PRESET_EMOJI = [
  '🟩', '🔥', '⚔️', '🛡️', '🏰', '🌍', '⛏️', '🧱',
  '🧪', '🚀', '🐉', '🌟', '🎮', '❄️', '🌲', '💎',
  '🤖', '👾', '🎯', '⚙️', '🍄', '🌈'
]

/** Rendert das Instanz-Icon: Bild (data:), Emoji oder Standard-Würfel. */
export function InstanceIcon({
  icon,
  size = 24
}: {
  icon?: string
  size?: number
}): JSX.Element {
  if (icon?.startsWith('data:')) {
    return (
      <img
        src={icon}
        width={size}
        height={size}
        alt=""
        style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }}
      />
    )
  }
  if (icon) {
    return <span style={{ fontSize: Math.round(size * 0.82), lineHeight: 1 }}>{icon}</span>
  }
  return <Icon name="cube" size={size} />
}

/** Skaliert ein Bild auf 128×128 (cover) und liefert eine PNG-data:-URL. */
function fileToIconDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Kein gültiges Bild.'))
      img.onload = () => {
        const s = 128
        const canvas = document.createElement('canvas')
        canvas.width = s
        canvas.height = s
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas nicht verfügbar.'))
        const scale = Math.max(s / img.width, s / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (s - w) / 2, (s - h) / 2, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export interface IconPickerProps {
  current?: string
  onPick: (icon: string) => void
  onClose: () => void
}

export function IconPicker({ current, onPick, onClose }: IconPickerProps): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    try {
      onPick(await fileToIconDataUrl(file))
    } catch {
      /* ignorieren */
    }
  }

  return (
    <Modal open onClose={onClose} title="Icon wählen" width={420}>
      <div className="emoji-grid">
        {PRESET_EMOJI.map((e) => (
          <button
            key={e}
            className={`emoji-cell ${current === e ? 'is-active' : ''}`}
            onClick={() => onPick(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <Button onClick={() => fileRef.current?.click()}>Bild hochladen …</Button>
        <Button variant="ghost" onClick={() => onPick('')}>
          Standard
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
    </Modal>
  )
}

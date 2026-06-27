import { useState } from 'react'
import type { DeviceCodeInfo } from '@shared/ipc'
import { Modal, Button, Chip, Spinner } from './ui'

export interface DeviceCodeDialogProps {
  code: DeviceCodeInfo | null
  error: string | null
  onClose: () => void
}

/**
 * Modaler Anmelde-Dialog für den Microsoft Device-Code-Login. Zeigt den Code,
 * öffnet die Microsoft-Seite im Standardbrowser und kopiert den Code per Klick.
 */
export default function DeviceCodeDialog({
  code,
  error,
  onClose
}: DeviceCodeDialogProps): JSX.Element {
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    if (!code) return
    await navigator.clipboard.writeText(code.userCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const title = error
    ? 'Anmeldung fehlgeschlagen'
    : code
      ? 'Mit Microsoft anmelden'
      : 'Anmeldung wird gestartet …'

  return (
    <Modal open onClose={onClose} title={title} width={460}>
      {error ? (
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      ) : !code ? (
        <div className="row">
          <Spinner /> <span className="muted">Der Anmeldecode wird angefordert …</span>
        </div>
      ) : (
        <>
          <p className="text-soft">
            Öffne die Microsoft-Seite und gib diesen Code ein. Sobald du dort
            bestätigt hast, geht es hier automatisch weiter.
          </p>

          <button className="device-code" onClick={copy} title="Code kopieren">
            {code.userCode}
            <span className="device-code__hint">
              {copied ? 'kopiert ✓' : 'klick zum Kopieren'}
            </span>
          </button>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Chip>wartet auf Bestätigung …</Chip>
            <Button variant="primary" onClick={() => window.open(code.directUri, '_blank')}>
              Im Browser öffnen ↗
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}

import { useState } from 'react'
import type { DeviceCodeInfo } from '@shared/ipc'
import { WiredButton } from './wired'

export interface DeviceCodeDialogProps {
  code: DeviceCodeInfo | null
  error: string | null
  onClose: () => void
}

/**
 * Modaler Anmelde-Dialog für den Microsoft Device-Code-Login. Zeigt den Code,
 * öffnet die Microsoft-Seite im Standardbrowser (über den window-open-Handler
 * des Main-Prozesses -> shell.openExternal) und kopiert den Code per Klick.
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

  return (
    <div className="modal-overlay" onClick={error ? onClose : undefined}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="doodle-card__border wobble" aria-hidden="true" />

        {error ? (
          <>
            <h2 style={{ color: 'var(--danger)' }}>Anmeldung fehlgeschlagen</h2>
            <p>{error}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <WiredButton onClick={onClose}>Schließen</WiredButton>
            </div>
          </>
        ) : !code ? (
          <>
            <h2>Anmeldung wird gestartet …</h2>
            <p>Einen Moment, der Anmeldecode wird angefordert.</p>
          </>
        ) : (
          <>
            <h2>Mit Microsoft anmelden</h2>
            <p>
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
              <span className="doodle-chip">wartet auf Bestätigung …</span>
              <WiredButton
                elevation={2}
                onClick={() => window.open(code.directUri, '_blank')}
              >
                Im Browser öffnen ↗
              </WiredButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

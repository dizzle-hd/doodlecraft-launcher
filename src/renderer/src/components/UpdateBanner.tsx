import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/ipc'
import { Button } from './ui'

/**
 * Dezenter Hinweis unten rechts, sobald ein Update verfügbar/heruntergeladen
 * ist. „Heruntergeladen“ bietet einen Neustart-Button an; das Update wird
 * spätestens beim nächsten Beenden ohnehin automatisch eingespielt.
 */
export default function UpdateBanner(): JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => window.api.on('update:status', setStatus), [])

  if (!status || status.state === 'error') return null

  if (status.state === 'available') {
    return (
      <div className="update-banner">
        <span className="muted">
          Update {status.version ? `${status.version} ` : ''}wird geladen …
        </span>
      </div>
    )
  }

  return (
    <div className="update-banner update-banner--ready">
      <span>Update {status.version ?? ''} bereit</span>
      <Button small variant="primary" onClick={() => window.api.invoke('update:install')}>
        Neu starten
      </Button>
    </div>
  )
}

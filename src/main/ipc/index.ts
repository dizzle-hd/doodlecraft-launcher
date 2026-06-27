import { app } from 'electron'
import { handle } from './registry'
import { registerAuthHandlers } from './auth'

/**
 * Registriert alle IPC-Handler. Pro Meilenstein kommen hier weitere
 * Handler-Module dazu (versions, instances, launch, ...).
 */
export function registerIpcHandlers(): void {
  handle('app:getInfo', () => ({
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    platform: process.platform
  }))

  handle('app:ping', (_ctx, message) => `pong: ${message}`)

  registerAuthHandlers()
}

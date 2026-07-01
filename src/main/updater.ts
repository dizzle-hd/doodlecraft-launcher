import { app, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { emit } from './ipc/registry'

/**
 * Auto-Updates über electron-updater. Quelle ist das GitHub-Release (siehe
 * `publish` in electron-builder.yml). Funktioniert für das **AppImage**-Paket;
 * .deb-Nutzer aktualisieren über ihren Paketmanager bzw. ein neues Release.
 *
 * Ablauf: beim Start prüfen → automatisch herunterladen → der Renderer bekommt
 * `update:status`-Events und kann zum Neustart auffordern (siehe UpdateBanner).
 * Spätestens beim nächsten Beenden wird das Update automatisch eingespielt.
 */
export function initAutoUpdates(window: BrowserWindow): void {
  // Im Dev-Modus (nicht gepackt) gibt es keine Update-Quelle.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const send = (payload: Parameters<typeof emit<'update:status'>>[2]): void => {
    if (!window.isDestroyed()) emit(window.webContents, 'update:status', payload)
  }

  autoUpdater.on('update-available', (info) => {
    send({ state: 'available', version: info.version })
  })
  autoUpdater.on('update-downloaded', (info) => {
    send({ state: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', (err) => {
    send({ state: 'error', message: String(err?.message ?? err) })
  })

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater]', err)
  })
}

/** Installiert das heruntergeladene Update und startet die App neu. */
export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

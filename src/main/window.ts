import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
// Wird von electron-vite ins Build kopiert; liefert den Laufzeit-Pfad zum Icon.
// Setzt unter Linux das Fenster-Icon (_NET_WM_ICON) -> Taskleiste/Dock.
import appIcon from '../../resources/icon.png?asset'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

/** Erstellt das Hauptfenster mit sicheren Defaults (kein nodeIntegration im Renderer). */
export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: '#16181c',
    autoHideMenuBar: true,
    title: 'DoodleCraft Launcher',
    icon: appIcon,
    // Rahmenloses Fenster mit eigener Titelleiste (siehe TitleBar.tsx).
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => window.show())

  // Maximierungs-Status an den Renderer melden (für das Maximieren-Icon).
  const emitMaxState = (): void =>
    window.webContents.send('window:maximizedChanged', window.isMaximized())
  window.on('maximize', emitMaxState)
  window.on('unmaximize', emitMaxState)

  // Externe Links im Standardbrowser öffnen, nicht im App-Fenster.
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

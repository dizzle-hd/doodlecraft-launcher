import { BrowserWindow } from 'electron'
import { handle } from './registry'
import type { HandlerContext } from './registry'

function win(ctx: HandlerContext): BrowserWindow | null {
  return BrowserWindow.fromWebContents(ctx.sender)
}

/** IPC-Handler für die eigene Titelleiste (rahmenloses Fenster). */
export function registerWindowHandlers(): void {
  handle('window:minimize', (ctx) => {
    win(ctx)?.minimize()
  })
  handle('window:toggleMaximize', (ctx) => {
    const w = win(ctx)
    if (!w) return false
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
    return w.isMaximized()
  })
  handle('window:close', (ctx) => {
    win(ctx)?.close()
  })
  handle('window:isMaximized', (ctx) => win(ctx)?.isMaximized() ?? false)
}

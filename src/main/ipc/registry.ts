import { ipcMain, type WebContents } from 'electron'
import type {
  IpcInvokeChannel,
  InvokeArgs,
  InvokeResult,
  IpcEventChannel,
  EventPayload
} from '@shared/ipc'

/** Kontext, den Handler erhalten, um z. B. Push-Events zurückzusenden. */
export interface HandlerContext {
  sender: WebContents
}

/**
 * Typsichere Wrapper um Electrons IPC. `handle` registriert einen
 * invoke-Handler, `emit` schickt ein Push-Event an einen Renderer.
 * So bleiben alle Channel-Namen an die Contracts in `@shared/ipc` gebunden.
 */
export function handle<C extends IpcInvokeChannel>(
  channel: C,
  listener: (
    ctx: HandlerContext,
    ...args: InvokeArgs<C>
  ) => InvokeResult<C> | Promise<InvokeResult<C>>
): void {
  ipcMain.handle(channel, (event, ...args) =>
    listener({ sender: event.sender }, ...(args as InvokeArgs<C>))
  )
}

export function emit<C extends IpcEventChannel>(
  target: WebContents,
  channel: C,
  payload: EventPayload<C>
): void {
  target.send(channel, payload)
}

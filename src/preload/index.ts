import { contextBridge, ipcRenderer } from 'electron'
import type {
  IpcInvokeChannel,
  InvokeArgs,
  InvokeResult,
  IpcEventChannel,
  EventPayload
} from '@shared/ipc'

/**
 * Sichere, typsichere Brücke in den Renderer. Es wird KEIN voller ipcRenderer
 * exponiert, sondern nur generische invoke/on-Funktionen, die an die
 * Channel-Contracts gebunden sind.
 */
const api = {
  invoke<C extends IpcInvokeChannel>(
    channel: C,
    ...args: InvokeArgs<C>
  ): Promise<InvokeResult<C>> {
    return ipcRenderer.invoke(channel, ...args)
  },

  /** Abonniert ein Push-Event. Gibt eine Unsubscribe-Funktion zurück. */
  on<C extends IpcEventChannel>(
    channel: C,
    listener: (payload: EventPayload<C>) => void
  ): () => void {
    const handler = (_event: unknown, payload: EventPayload<C>): void =>
      listener(payload)
    ipcRenderer.on(channel, handler as never)
    return () => ipcRenderer.removeListener(channel, handler as never)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type LauncherApi = typeof api

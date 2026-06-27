import { handle } from './registry'
import { getSettings, updateSettings } from '../store'
import { listVersions } from '../services/versions'
import {
  listInstances,
  createInstance,
  deleteInstance,
  duplicateInstance
} from '../services/instances'
import { installInstance } from '../services/install'
import { launchInstance, runningInstanceIds } from '../services/launch'

/** IPC-Handler für Einstellungen, Versionen, Instanzen (M4) und Start (M5). */
export function registerInstanceHandlers(): void {
  handle('settings:get', () => getSettings())
  handle('settings:update', (_ctx, patch) => updateSettings(patch))

  handle('versions:list', () => listVersions())

  handle('instances:list', () => listInstances())
  handle('instances:create', (_ctx, input) => createInstance(input))
  handle('instances:delete', (_ctx, id) => deleteInstance(id))
  handle('instances:duplicate', (_ctx, id) => duplicateInstance(id))
  handle('instances:install', (ctx, id) => installInstance(ctx.sender, id))
  handle('instances:launch', (ctx, id) => launchInstance(ctx.sender, id))
  handle('instances:running', () => runningInstanceIds())
}

import { shell } from 'electron'
import { handle } from './registry'
import { getSettings, updateSettings } from '../store'
import { listVersions } from '../services/versions'
import {
  listInstances,
  createInstance,
  deleteInstance,
  duplicateInstance,
  renameInstance,
  setInstanceIcon,
  instanceDir
} from '../services/instances'
import { installInstance } from '../services/install'
import {
  launchInstance,
  runningInstanceIds,
  getLogs,
  clearLogs
} from '../services/launch'
import { listLoaderVersions } from '../services/loaders'

/** IPC-Handler für Einstellungen, Versionen, Instanzen (M4) und Start (M5). */
export function registerInstanceHandlers(): void {
  handle('settings:get', () => getSettings())
  handle('settings:update', (_ctx, patch) => updateSettings(patch))

  handle('versions:list', () => listVersions())
  handle('loaders:list', (_ctx, loader, mcVersion) =>
    listLoaderVersions(loader, mcVersion)
  )

  handle('instances:list', () => listInstances())
  handle('instances:create', (_ctx, input) => createInstance(input))
  handle('instances:delete', (_ctx, id) => deleteInstance(id))
  handle('instances:duplicate', (_ctx, id) => duplicateInstance(id))
  handle('instances:rename', (_ctx, id, name) => renameInstance(id, name))
  handle('instances:setIcon', (_ctx, id, icon) => setInstanceIcon(id, icon))
  handle('instances:openFolder', async (_ctx, id) => {
    await shell.openPath(instanceDir(id))
  })
  handle('instances:install', (ctx, id) => installInstance(ctx.sender, id))
  handle('instances:launch', (ctx, id) => launchInstance(ctx.sender, id))
  handle('instances:running', () => runningInstanceIds())
  handle('logs:get', (_ctx, id) => getLogs(id))
  handle('logs:clear', (_ctx, id) => clearLogs(id))
}

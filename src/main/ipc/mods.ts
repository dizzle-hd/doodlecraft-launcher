import { handle } from './registry'
import {
  searchMods,
  installMod,
  listMods,
  removeMod,
  setModEnabled,
  checkModUpdates,
  updateMod
} from '../services/mods'
import { searchModpacks, installModpack } from '../services/modpacks'

/** IPC-Handler für Mods und Modpacks (M7, Modrinth). */
export function registerModHandlers(): void {
  handle('mods:search', (_ctx, instanceId, query) => searchMods(instanceId, query))
  handle('mods:install', (_ctx, instanceId, projectId) =>
    installMod(instanceId, projectId)
  )
  handle('mods:list', (_ctx, instanceId) => listMods(instanceId))
  handle('mods:remove', (_ctx, instanceId, fileName) =>
    removeMod(instanceId, fileName)
  )
  handle('mods:setEnabled', (_ctx, instanceId, fileName, enabled) =>
    setModEnabled(instanceId, fileName, enabled)
  )
  handle('mods:checkUpdates', (_ctx, instanceId) => checkModUpdates(instanceId))
  handle('mods:update', (_ctx, instanceId, fileName) => updateMod(instanceId, fileName))

  handle('modpacks:search', (_ctx, query) => searchModpacks(query))
  handle('modpacks:install', (ctx, projectId) => installModpack(ctx.sender, projectId))
}

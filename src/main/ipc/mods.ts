import { handle } from './registry'
import {
  searchMods,
  installMod,
  listModsWithIcons,
  removeMod,
  setModEnabled,
  checkModUpdates,
  updateMod
} from '../services/mods'
import { searchModpacks, installModpack } from '../services/modpacks'
import {
  searchContent,
  installContent,
  listContentWithIcons,
  removeContent,
  checkContentUpdates,
  updateContent
} from '../services/content'

/** IPC-Handler für Mods und Modpacks (M7, Modrinth). */
export function registerModHandlers(): void {
  handle('mods:search', (_ctx, instanceId, query, offset) =>
    searchMods(instanceId, query, offset)
  )
  handle('mods:install', (_ctx, instanceId, projectId) =>
    installMod(instanceId, projectId)
  )
  handle('mods:list', (_ctx, instanceId) => listModsWithIcons(instanceId))
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

  // Loader-freie Inhalte (Ressourcenpakete, Shader, Datapacks)
  handle('content:search', (_ctx, instanceId, kind, query, offset) =>
    searchContent(instanceId, kind, query, offset)
  )
  handle('content:install', (_ctx, instanceId, kind, projectId) =>
    installContent(instanceId, kind, projectId)
  )
  handle('content:list', (_ctx, instanceId, kind) =>
    listContentWithIcons(instanceId, kind)
  )
  handle('content:remove', (_ctx, instanceId, kind, fileName) =>
    removeContent(instanceId, kind, fileName)
  )
  handle('content:checkUpdates', (_ctx, instanceId, kind) =>
    checkContentUpdates(instanceId, kind)
  )
  handle('content:update', (_ctx, instanceId, kind, fileName) =>
    updateContent(instanceId, kind, fileName)
  )
}

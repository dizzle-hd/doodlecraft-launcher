import {
  getVersionList,
  type MinecraftVersionList,
  type MinecraftVersionBaseInfo
} from '@xmcl/installer'
import { getSettings } from '../store'
import type { VersionList, VersionSummary } from '@shared/ipc'

/**
 * Versions-Manifest von Mojang. Wird im Speicher gecacht, damit nicht jede
 * UI-Interaktion einen Netzwerk-Request auslöst.
 */
let cache: { list: MinecraftVersionList; fetchedAt: number } | null = null
const TTL_MS = 30 * 60 * 1000

async function loadManifest(force = false): Promise<MinecraftVersionList> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.list
  }
  const list = await getVersionList()
  cache = { list, fetchedAt: Date.now() }
  return list
}

/**
 * Liefert die Versionsliste für die UI. Snapshots werden nur aufgenommen, wenn
 * das Setting `showSnapshots` aktiv ist; Releases sind immer dabei.
 */
export async function listVersions(): Promise<VersionList> {
  const manifest = await loadManifest()
  const showSnapshots = getSettings().showSnapshots
  const versions: VersionSummary[] = manifest.versions
    .filter((v) => showSnapshots || v.type === 'release')
    .map((v) => ({ id: v.id, type: v.type, releaseTime: v.releaseTime }))
  return {
    latestRelease: manifest.latest.release,
    latestSnapshot: manifest.latest.snapshot,
    versions
  }
}

/** Sucht die Download-Metadaten (id + url) einer konkreten Version heraus. */
export async function getVersionMeta(id: string): Promise<MinecraftVersionBaseInfo> {
  const manifest = await loadManifest()
  const found = manifest.versions.find((v) => v.id === id)
  if (!found) {
    throw new Error(`Unbekannte Minecraft-Version: ${id}`)
  }
  return { id: found.id, url: found.url }
}

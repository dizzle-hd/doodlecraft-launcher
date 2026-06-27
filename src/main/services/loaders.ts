import {
  getLoaderArtifactListFor,
  getQuiltLoaderVersionsByMinecraft,
  getForgeVersionList
} from '@xmcl/installer'
import type { LoaderType, LoaderVersion } from '@shared/ipc'

/**
 * Verfügbare Loader-Versionen für einen Loader-Typ und eine MC-Version.
 * Reihenfolge entspricht der jeweiligen API (neueste/empfohlene zuerst).
 */
export async function listLoaderVersions(
  loader: LoaderType,
  mcVersion: string
): Promise<LoaderVersion[]> {
  if (loader === 'fabric') {
    const list = await getLoaderArtifactListFor(mcVersion)
    return list.map((a) => ({ version: a.loader.version, stable: a.loader.stable }))
  }
  if (loader === 'quilt') {
    const list = await getQuiltLoaderVersionsByMinecraft({ minecraftVersion: mcVersion })
    return list.map((a) => ({ version: a.loader.version, stable: a.loader.stable }))
  }
  // forge
  const list = await getForgeVersionList({ minecraft: mcVersion })
  return list.versions.map((v) => ({
    version: v.version,
    recommended: v.type === 'recommended',
    stable: v.type === 'recommended' || v.type === 'common'
  }))
}

/**
 * Ermittelt eine sinnvolle Standard-Loader-Version: erst „recommended", sonst
 * die erste als stabil markierte, sonst die erste der Liste.
 */
export async function resolveDefaultLoaderVersion(
  loader: LoaderType,
  mcVersion: string
): Promise<string> {
  const versions = await listLoaderVersions(loader, mcVersion)
  if (versions.length === 0) {
    throw new Error(
      `Keine ${loader}-Loader-Version für Minecraft ${mcVersion} gefunden.`
    )
  }
  const recommended = versions.find((v) => v.recommended)
  const stable = versions.find((v) => v.stable)
  return (recommended ?? stable ?? versions[0]).version
}

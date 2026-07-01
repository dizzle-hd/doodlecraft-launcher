import { join } from 'path'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'fs'
import { download } from '@xmcl/file-transfer'
import { instanceDir, readInstanceOrThrow } from './instances'
import {
  modrinthGet,
  searchProjects,
  type ModrinthVersion
} from './modrinth'
import type { InstalledMod, Instance, ModSearchHit } from '@shared/ipc'

const INDEX_FILE = '.doodlecraft-mods.json'
const DISABLED_SUFFIX = '.disabled'

interface IndexEntry {
  projectId?: string
  name?: string
  version?: string
  /** Modrinth-Versions-ID – für zuverlässige Update-Erkennung. */
  versionId?: string
  /** Projekt-Icon (Modrinth-CDN). */
  iconUrl?: string
}
type ModIndex = Record<string, IndexEntry>

/** mods-Ordner einer Instanz (wird bei Bedarf angelegt). */
function modsDir(instanceId: string): string {
  const dir = join(instanceDir(instanceId), 'mods')
  mkdirSync(dir, { recursive: true })
  return dir
}

function assertSafeName(fileName: string): void {
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
    throw new Error('Ungültiger Dateiname.')
  }
}

function baseName(fileName: string): string {
  return fileName.endsWith(DISABLED_SUFFIX)
    ? fileName.slice(0, -DISABLED_SUFFIX.length)
    : fileName
}

// --- Install-Index (Datei -> Metadaten) -------------------------------------

function readIndex(instanceId: string): ModIndex {
  try {
    return JSON.parse(readFileSync(join(modsDir(instanceId), INDEX_FILE), 'utf8')) as ModIndex
  } catch {
    return {}
  }
}

function writeIndex(instanceId: string, index: ModIndex): void {
  writeFileSync(join(modsDir(instanceId), INDEX_FILE), JSON.stringify(index, null, 2))
}

function recordIndex(instanceId: string, fileName: string, entry: IndexEntry): void {
  const index = readIndex(instanceId)
  index[baseName(fileName)] = entry
  writeIndex(instanceId, index)
}

// --- Suche ------------------------------------------------------------------

export async function searchMods(
  instanceId: string,
  query: string,
  offset = 0
): Promise<ModSearchHit[]> {
  const instance = readInstanceOrThrow(instanceId)
  const facets: string[][] = [['project_type:mod'], [`versions:${instance.mcVersion}`]]
  // Loader-Facette nur, wenn die Instanz einen Loader nutzt.
  if (instance.loader) facets.push([`categories:${instance.loader}`])
  return searchProjects(query, facets, offset)
}

// --- Installation ------------------------------------------------------------

/** Wählt die zur Instanz passende, neueste Modrinth-Version eines Projekts. */
async function resolveVersion(
  instance: Instance,
  projectId: string
): Promise<ModrinthVersion> {
  const params = new URLSearchParams({
    game_versions: JSON.stringify([instance.mcVersion])
  })
  if (instance.loader) params.set('loaders', JSON.stringify([instance.loader]))
  const versions = await modrinthGet<ModrinthVersion[]>(
    `/project/${projectId}/version?${params}`
  )
  if (versions.length === 0) {
    throw new Error('Keine passende Mod-Version für diese Instanz gefunden.')
  }
  return versions[0]
}

/** Holt die Icon-URL eines Modrinth-Projekts (best effort). */
async function fetchProjectIcon(projectId: string): Promise<string | undefined> {
  try {
    const project = await modrinthGet<{ icon_url?: string }>(`/project/${projectId}`)
    return project.icon_url || undefined
  } catch {
    return undefined
  }
}

async function installRecursive(
  instance: Instance,
  projectId: string,
  seen: Set<string>
): Promise<void> {
  if (seen.has(projectId)) return
  seen.add(projectId)

  const version = await resolveVersion(instance, projectId)
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error('Mod-Datei nicht gefunden.')

  const dest = join(modsDir(instance.id), file.filename)
  await download({
    url: file.url,
    destination: dest,
    validator: file.hashes?.sha1
      ? { algorithm: 'sha1', hash: file.hashes.sha1 }
      : undefined
  })
  recordIndex(instance.id, file.filename, {
    projectId,
    name: version.name,
    version: version.version_number,
    versionId: version.id,
    iconUrl: await fetchProjectIcon(projectId)
  })

  // Pflicht-Abhängigkeiten mitinstallieren.
  for (const dep of version.dependencies ?? []) {
    if (dep.dependency_type === 'required' && dep.project_id) {
      await installRecursive(instance, dep.project_id, seen)
    }
  }
}

export async function installMod(
  instanceId: string,
  projectId: string
): Promise<InstalledMod[]> {
  const instance = readInstanceOrThrow(instanceId)
  await installRecursive(instance, projectId, new Set())
  return listMods(instanceId)
}

// --- Verwaltung --------------------------------------------------------------

export function listMods(instanceId: string): InstalledMod[] {
  const dir = modsDir(instanceId)
  const index = readIndex(instanceId)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jar') || f.endsWith(`.jar${DISABLED_SUFFIX}`))
    .map((fileName) => {
      const enabled = !fileName.endsWith(DISABLED_SUFFIX)
      const meta = index[baseName(fileName)] ?? {}
      return {
        fileName,
        enabled,
        size: statSync(join(dir, fileName)).size,
        name: meta.name,
        projectId: meta.projectId,
        version: meta.version,
        iconUrl: meta.iconUrl
      }
    })
    .sort((a, b) => (a.name ?? a.fileName).localeCompare(b.name ?? b.fileName))
}

/** Wie listMods, füllt aber einmalig fehlende Projekt-Icons nach (best effort). */
export async function listModsWithIcons(instanceId: string): Promise<InstalledMod[]> {
  const index = readIndex(instanceId)
  const missing = Object.entries(index).filter(([, m]) => m.projectId && !m.iconUrl)
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async ([key, m]) => {
        const icon = await fetchProjectIcon(m.projectId!)
        if (icon) index[key].iconUrl = icon
      })
    )
    writeIndex(instanceId, index)
  }
  return listMods(instanceId)
}

export function removeMod(instanceId: string, fileName: string): InstalledMod[] {
  assertSafeName(fileName)
  rmSync(join(modsDir(instanceId), fileName), { force: true })
  const index = readIndex(instanceId)
  delete index[baseName(fileName)]
  writeIndex(instanceId, index)
  return listMods(instanceId)
}

export function setModEnabled(
  instanceId: string,
  fileName: string,
  enabled: boolean
): InstalledMod[] {
  assertSafeName(fileName)
  const dir = modsDir(instanceId)
  const isDisabled = fileName.endsWith(DISABLED_SUFFIX)
  let target = fileName
  if (enabled && isDisabled) target = fileName.slice(0, -DISABLED_SUFFIX.length)
  else if (!enabled && !isDisabled) target = fileName + DISABLED_SUFFIX
  if (target !== fileName) renameSync(join(dir, fileName), join(dir, target))
  return listMods(instanceId)
}

// --- Updates -----------------------------------------------------------------

/**
 * Prüft für jede installierte Mod (mit bekannter Projekt-ID), ob bei Modrinth
 * eine neuere passende Version vorliegt, und setzt ggf. `updateVersion`.
 */
export async function checkModUpdates(instanceId: string): Promise<InstalledMod[]> {
  const instance = readInstanceOrThrow(instanceId)
  const index = readIndex(instanceId)
  const mods = listMods(instanceId)

  await Promise.all(
    mods.map(async (mod) => {
      const meta = index[baseName(mod.fileName)]
      if (!meta?.projectId) return
      try {
        const latest = await resolveVersion(instance, meta.projectId)
        const newest = latest.files.find((f) => f.primary) ?? latest.files[0]
        const isNewer = meta.versionId
          ? latest.id !== meta.versionId
          : newest?.filename !== baseName(mod.fileName)
        if (isNewer) mod.updateVersion = latest.version_number
      } catch {
        // Einzelne Fehlschläge ignorieren (Netz/entferntes Projekt).
      }
    })
  )
  return mods
}

/** Aktualisiert eine Mod auf die neueste passende Version (Status bleibt erhalten). */
export async function updateMod(
  instanceId: string,
  fileName: string
): Promise<InstalledMod[]> {
  assertSafeName(fileName)
  const instance = readInstanceOrThrow(instanceId)
  const dir = modsDir(instanceId)
  const base = baseName(fileName)
  const meta = readIndex(instanceId)[base]
  if (!meta?.projectId) {
    throw new Error('Keine Projekt-Info gespeichert – Update nicht möglich.')
  }

  const version = await resolveVersion(instance, meta.projectId)
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error('Neue Mod-Datei nicht gefunden.')

  const wasDisabled = fileName.endsWith(DISABLED_SUFFIX)
  const newName = file.filename + (wasDisabled ? DISABLED_SUFFIX : '')
  await download({
    url: file.url,
    destination: join(dir, newName),
    validator: file.hashes?.sha1
      ? { algorithm: 'sha1', hash: file.hashes.sha1 }
      : undefined
  })

  // Alte Datei + alten Index-Eintrag entfernen, falls der Name sich geändert hat.
  const index = readIndex(instanceId)
  if (file.filename !== base) {
    rmSync(join(dir, fileName), { force: true })
    delete index[base]
  }
  index[file.filename] = {
    projectId: meta.projectId,
    name: version.name,
    version: version.version_number,
    versionId: version.id,
    iconUrl: meta.iconUrl ?? (await fetchProjectIcon(meta.projectId))
  }
  writeIndex(instanceId, index)
  return listMods(instanceId)
}

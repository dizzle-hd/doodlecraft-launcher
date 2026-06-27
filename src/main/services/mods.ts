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
  query: string
): Promise<ModSearchHit[]> {
  const instance = readInstanceOrThrow(instanceId)
  const facets: string[][] = [['project_type:mod'], [`versions:${instance.mcVersion}`]]
  // Loader-Facette nur, wenn die Instanz einen Loader nutzt.
  if (instance.loader) facets.push([`categories:${instance.loader}`])
  return searchProjects(query, facets)
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
    version: version.version_number
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
        version: meta.version
      }
    })
    .sort((a, b) => (a.name ?? a.fileName).localeCompare(b.name ?? b.fileName))
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

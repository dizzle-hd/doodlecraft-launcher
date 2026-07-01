import { join } from 'path'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'fs'
import { download } from '@xmcl/file-transfer'
import { instanceDir, readInstanceOrThrow } from './instances'
import { modrinthGet, searchProjects, type ModrinthVersion } from './modrinth'
import type { ContentKind, InstalledMod, ModSearchHit } from '@shared/ipc'

/**
 * Generische Verwaltung von Modrinth-Inhalten ohne Loader-Bezug und ohne
 * Abhängigkeiten – aktuell Ressourcenpakete (Shader/Datapacks lassen sich über
 * `KINDS` mit einer Zeile ergänzen). Mods haben einen eigenen Service, weil sie
 * Loader-spezifisch sind und Abhängigkeiten mitziehen.
 */

interface KindConfig {
  /** Unterordner der Instanz. */
  folder: string
  /** Modrinth `project_type` für die Suche. */
  projectType: string
}

const KINDS: Record<ContentKind, KindConfig> = {
  resourcepack: { folder: 'resourcepacks', projectType: 'resourcepack' },
  shaderpack: { folder: 'shaderpacks', projectType: 'shader' },
  datapack: { folder: 'datapacks', projectType: 'datapack' }
}

const INDEX_FILE = '.doodlecraft-content.json'

interface IndexEntry {
  projectId?: string
  name?: string
  version?: string
  versionId?: string
  iconUrl?: string
}
type ContentIndex = Record<string, IndexEntry>

function contentDir(instanceId: string, kind: ContentKind): string {
  const dir = join(instanceDir(instanceId), KINDS[kind].folder)
  mkdirSync(dir, { recursive: true })
  return dir
}

function assertSafeName(fileName: string): void {
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
    throw new Error('Ungültiger Dateiname.')
  }
}

function readIndex(dir: string): ContentIndex {
  try {
    return JSON.parse(readFileSync(join(dir, INDEX_FILE), 'utf8')) as ContentIndex
  } catch {
    return {}
  }
}
function writeIndex(dir: string, index: ContentIndex): void {
  writeFileSync(join(dir, INDEX_FILE), JSON.stringify(index, null, 2))
}

/** Icon-URL eines Modrinth-Projekts (best effort). */
async function fetchProjectIcon(projectId: string): Promise<string | undefined> {
  try {
    const project = await modrinthGet<{ icon_url?: string }>(`/project/${projectId}`)
    return project.icon_url || undefined
  } catch {
    return undefined
  }
}

// --- Suche ------------------------------------------------------------------

export async function searchContent(
  instanceId: string,
  kind: ContentKind,
  query: string,
  offset = 0
): Promise<ModSearchHit[]> {
  const instance = readInstanceOrThrow(instanceId)
  const facets: string[][] = [
    [`project_type:${KINDS[kind].projectType}`],
    [`versions:${instance.mcVersion}`]
  ]
  return searchProjects(query, facets, offset)
}

// --- Installation ------------------------------------------------------------

/** Wählt die zur MC-Version passende, neueste Modrinth-Version (ohne Loader). */
async function resolveVersion(
  mcVersion: string,
  projectId: string
): Promise<ModrinthVersion> {
  const params = new URLSearchParams({ game_versions: JSON.stringify([mcVersion]) })
  const versions = await modrinthGet<ModrinthVersion[]>(
    `/project/${projectId}/version?${params}`
  )
  if (versions.length === 0) {
    throw new Error('Keine passende Version für diese Instanz gefunden.')
  }
  return versions[0]
}

export async function installContent(
  instanceId: string,
  kind: ContentKind,
  projectId: string
): Promise<InstalledMod[]> {
  const instance = readInstanceOrThrow(instanceId)
  const dir = contentDir(instanceId, kind)
  const version = await resolveVersion(instance.mcVersion, projectId)
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error('Datei nicht gefunden.')

  await download({
    url: file.url,
    destination: join(dir, file.filename),
    validator: file.hashes?.sha1
      ? { algorithm: 'sha1', hash: file.hashes.sha1 }
      : undefined
  })

  const index = readIndex(dir)
  index[file.filename] = {
    projectId,
    name: version.name,
    version: version.version_number,
    versionId: version.id,
    iconUrl: await fetchProjectIcon(projectId)
  }
  writeIndex(dir, index)
  return listContent(instanceId, kind)
}

// --- Verwaltung --------------------------------------------------------------

export function listContent(instanceId: string, kind: ContentKind): InstalledMod[] {
  const dir = contentDir(instanceId, kind)
  const index = readIndex(dir)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.zip'))
    .map((fileName) => {
      const meta = index[fileName] ?? {}
      return {
        fileName,
        enabled: true,
        size: statSync(join(dir, fileName)).size,
        name: meta.name,
        projectId: meta.projectId,
        version: meta.version,
        iconUrl: meta.iconUrl
      }
    })
    .sort((a, b) => (a.name ?? a.fileName).localeCompare(b.name ?? b.fileName))
}

/** Wie listContent, füllt aber einmalig fehlende Projekt-Icons nach. */
export async function listContentWithIcons(
  instanceId: string,
  kind: ContentKind
): Promise<InstalledMod[]> {
  const dir = contentDir(instanceId, kind)
  const index = readIndex(dir)
  const missing = Object.entries(index).filter(([, m]) => m.projectId && !m.iconUrl)
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async ([key, m]) => {
        const icon = await fetchProjectIcon(m.projectId!)
        if (icon) index[key].iconUrl = icon
      })
    )
    writeIndex(dir, index)
  }
  return listContent(instanceId, kind)
}

export function removeContent(
  instanceId: string,
  kind: ContentKind,
  fileName: string
): InstalledMod[] {
  assertSafeName(fileName)
  const dir = contentDir(instanceId, kind)
  rmSync(join(dir, fileName), { force: true })
  const index = readIndex(dir)
  delete index[fileName]
  writeIndex(dir, index)
  return listContent(instanceId, kind)
}

export async function checkContentUpdates(
  instanceId: string,
  kind: ContentKind
): Promise<InstalledMod[]> {
  const instance = readInstanceOrThrow(instanceId)
  const dir = contentDir(instanceId, kind)
  const index = readIndex(dir)
  const mods = listContent(instanceId, kind)
  await Promise.all(
    mods.map(async (mod) => {
      const meta = index[mod.fileName]
      if (!meta?.projectId) return
      try {
        const latest = await resolveVersion(instance.mcVersion, meta.projectId)
        if (latest.id !== meta.versionId) mod.updateVersion = latest.version_number
      } catch {
        /* ignorieren */
      }
    })
  )
  return mods
}

export async function updateContent(
  instanceId: string,
  kind: ContentKind,
  fileName: string
): Promise<InstalledMod[]> {
  assertSafeName(fileName)
  const instance = readInstanceOrThrow(instanceId)
  const dir = contentDir(instanceId, kind)
  const meta = readIndex(dir)[fileName]
  if (!meta?.projectId) {
    throw new Error('Keine Projekt-Info gespeichert – Update nicht möglich.')
  }
  const version = await resolveVersion(instance.mcVersion, meta.projectId)
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error('Neue Datei nicht gefunden.')

  await download({
    url: file.url,
    destination: join(dir, file.filename),
    validator: file.hashes?.sha1
      ? { algorithm: 'sha1', hash: file.hashes.sha1 }
      : undefined
  })

  const index = readIndex(dir)
  if (file.filename !== fileName) {
    rmSync(join(dir, fileName), { force: true })
    delete index[fileName]
  }
  index[file.filename] = {
    projectId: meta.projectId,
    name: version.name,
    version: version.version_number,
    versionId: version.id,
    iconUrl: meta.iconUrl ?? (await fetchProjectIcon(meta.projectId))
  }
  writeIndex(dir, index)
  return listContent(instanceId, kind)
}

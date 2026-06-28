import { dirname, join, resolve, sep } from 'path'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { WebContents } from 'electron'
import { download } from '@xmcl/file-transfer'
import { open, readAllEntries, readEntry } from '@xmcl/unzip'
import { modrinthGet, searchProjects, type ModrinthVersion } from './modrinth'
import { createInstance, instanceDir, readInstanceOrThrow } from './instances'
import { installInstance } from './install'
import type { Instance, LoaderType, ModSearchHit } from '@shared/ipc'

/** Struktur der `modrinth.index.json` in einem `.mrpack` (genutzte Felder). */
interface ModpackIndex {
  name?: string
  versionId?: string
  dependencies: Record<string, string>
  files: {
    path: string
    downloads: string[]
    hashes?: { sha1?: string }
    env?: { client?: string; server?: string }
  }[]
}

export async function searchModpacks(query: string): Promise<ModSearchHit[]> {
  return searchProjects(query, [['project_type:modpack']])
}

/** Leitet Loader-Typ + -Version aus den Modpack-Dependencies ab. */
function deriveLoader(deps: Record<string, string>): {
  loader?: LoaderType
  loaderVersion?: string
} {
  if (deps['fabric-loader']) return { loader: 'fabric', loaderVersion: deps['fabric-loader'] }
  if (deps['quilt-loader']) return { loader: 'quilt', loaderVersion: deps['quilt-loader'] }
  if (deps['forge']) return { loader: 'forge', loaderVersion: deps['forge'] }
  // NeoForge o. Ä. werden (noch) nicht unterstützt -> Vanilla-Fallback.
  return {}
}

/** Verhindert Zip-Slip: hält das Ziel innerhalb des Instanz-Ordners. */
function safeJoin(base: string, rel: string): string {
  const target = resolve(base, rel)
  const root = resolve(base)
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Unsicherer Pfad im Modpack: ${rel}`)
  }
  return target
}

/**
 * Installiert ein Modrinth-Modpack als neue Instanz: lädt das `.mrpack`, leitet
 * Minecraft-Version + Loader ab, legt die Instanz an, entpackt `overrides/` und
 * lädt alle referenzierten Dateien. Danach läuft die normale Installation
 * (Vanilla + Loader + Java) über `installInstance`.
 */
export async function installModpack(
  sender: WebContents,
  projectId: string
): Promise<Instance> {
  const versions = await modrinthGet<ModrinthVersion[]>(`/project/${projectId}/version`)
  if (versions.length === 0) throw new Error('Modpack hat keine Versionen.')
  const version = versions[0]
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) throw new Error('Modpack-Datei nicht gefunden.')

  const tmp = join(tmpdir(), `mrpack-${randomUUID()}.mrpack`)
  let instance: Instance | null = null
  try {
    await download({ url: file.url, destination: tmp })

    const zip = await open(tmp)
    const entries = await readAllEntries(zip)
    const indexEntry = entries.find((e) => e.fileName === 'modrinth.index.json')
    if (!indexEntry) throw new Error('Ungültiges Modpack (modrinth.index.json fehlt).')
    const index = JSON.parse((await readEntry(zip, indexEntry)).toString('utf8')) as ModpackIndex

    const mcVersion = index.dependencies?.minecraft
    if (!mcVersion) throw new Error('Modpack nennt keine Minecraft-Version.')
    const { loader, loaderVersion } = deriveLoader(index.dependencies)

    instance = createInstance({
      name: index.name ?? `Modpack ${projectId}`,
      mcVersion,
      loader,
      loaderVersion
    })
    const dir = instanceDir(instance.id)

    // 1) overrides/ und client-overrides/ entpacken.
    for (const e of entries) {
      const m = e.fileName.match(/^(?:client-)?overrides\/(.+)$/)
      if (!m || e.fileName.endsWith('/')) continue
      const target = safeJoin(dir, m[1])
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, await readEntry(zip, e))
    }
    zip.close()

    // 2) referenzierte Dateien laden (serverseitig-only überspringen).
    for (const f of index.files) {
      if (f.env?.client === 'unsupported') continue
      const url = f.downloads?.[0]
      if (!url) continue
      const target = safeJoin(dir, f.path)
      mkdirSync(dirname(target), { recursive: true })
      await download({
        url,
        destination: target,
        validator: f.hashes?.sha1
          ? { algorithm: 'sha1', hash: f.hashes.sha1 }
          : undefined
      })
    }

    // 3) Vanilla + Loader + Java installieren (mit Fortschritts-Events).
    await installInstance(sender, instance.id)
    return readInstanceOrThrow(instance.id)
  } finally {
    rmSync(tmp, { force: true })
  }
}

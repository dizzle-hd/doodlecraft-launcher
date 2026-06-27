import { join } from 'path'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { paths } from '../paths'
import type { CreateInstanceInput, Instance } from '@shared/ipc'

const INSTANCE_FILE = 'instance.json'
const SLUG_RE = /^[a-z0-9-]+$/

/**
 * Instanzen sind eigenständige Ordner unter `paths.instances/<id>/` mit einer
 * `instance.json` als Metadaten. Die `id` ist zugleich der Ordnername (Slug);
 * Mods/Saves/Configs liegen je Instanz in diesem Ordner (M6/M7).
 */

/** Erzeugt aus einem Namen einen eindeutigen, dateisystem-sicheren Slug. */
function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'instanz'

  let slug = base
  let n = 2
  while (existsSync(join(paths.instances, slug))) {
    slug = `${base}-${n++}`
  }
  return slug
}

/** Validiert eine Instanz-ID gegen Path-Traversal und gibt den Ordner zurück. */
export function instanceDir(id: string): string {
  if (!SLUG_RE.test(id)) {
    throw new Error(`Ungültige Instanz-ID: ${id}`)
  }
  return join(paths.instances, id)
}

function writeInstance(instance: Instance): void {
  const dir = instanceDir(instance.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, INSTANCE_FILE), JSON.stringify(instance, null, 2), 'utf8')
}

function readInstance(id: string): Instance | null {
  try {
    const raw = readFileSync(join(paths.instances, id, INSTANCE_FILE), 'utf8')
    const data = JSON.parse(raw) as Instance
    // id immer aus dem Ordnernamen ableiten, damit beide nie auseinanderlaufen.
    return { ...data, id }
  } catch {
    return null
  }
}

function readInstanceOrThrow(id: string): Instance {
  const instance = readInstance(id)
  if (!instance) {
    throw new Error('Instanz nicht gefunden.')
  }
  return instance
}

export { readInstanceOrThrow }

/** Alle Instanzen, zuletzt gespielte bzw. erstellte zuerst. */
export function listInstances(): Instance[] {
  let entries: string[]
  try {
    entries = readdirSync(paths.instances, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    return []
  }
  return entries
    .map((name) => readInstance(name))
    .filter((x): x is Instance => x !== null)
    .sort((a, b) => (b.lastPlayed ?? b.createdAt) - (a.lastPlayed ?? a.createdAt))
}

export function createInstance(input: CreateInstanceInput): Instance {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Bitte einen Namen angeben.')
  }
  if (!input.mcVersion) {
    throw new Error('Bitte eine Minecraft-Version wählen.')
  }
  const instance: Instance = {
    id: slugify(name),
    name,
    mcVersion: input.mcVersion,
    loader: input.loader,
    loaderVersion: input.loaderVersion?.trim() || undefined,
    installed: false,
    createdAt: Date.now()
  }
  writeInstance(instance)
  return instance
}

export function deleteInstance(id: string): Instance[] {
  rmSync(instanceDir(id), { recursive: true, force: true })
  return listInstances()
}

export function duplicateInstance(id: string): Instance[] {
  const src = readInstanceOrThrow(id)
  const slug = slugify(`${src.name} Kopie`)
  cpSync(instanceDir(id), join(paths.instances, slug), { recursive: true })
  const copy: Instance = {
    ...src,
    id: slug,
    name: `${src.name} (Kopie)`,
    createdAt: Date.now(),
    lastPlayed: undefined
  }
  writeInstance(copy)
  return listInstances()
}

/** Teil-Update einer Instanz (z. B. `installed`, `lastPlayed`). */
export function patchInstance(id: string, patch: Partial<Instance>): Instance {
  const next: Instance = { ...readInstanceOrThrow(id), ...patch, id }
  writeInstance(next)
  return next
}

/** Benennt eine Instanz um (nur Anzeigename; Ordner/ID bleiben stabil). */
export function renameInstance(id: string, name: string): Instance[] {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Name darf nicht leer sein.')
  }
  patchInstance(id, { name: trimmed })
  return listInstances()
}

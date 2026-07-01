import type { ModSearchHit, ModProjectType } from '@shared/ipc'
import { MOD_SEARCH_PAGE_SIZE } from '@shared/ipc'

/** Gemeinsame Modrinth-API-Helfer (für Mods und Modpacks). */

export const MODRINTH_API = 'https://api.modrinth.com/v2'
// Modrinth bittet um einen aussagekräftigen User-Agent (Projekt/Kontakt).
export const MODRINTH_UA =
  'dizzle-hd/doodlecraft-launcher/0.1.0 (Minecraft Launcher)'

export async function modrinthGet<T>(path: string): Promise<T> {
  const res = await fetch(`${MODRINTH_API}${path}`, {
    headers: { 'User-Agent': MODRINTH_UA }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Modrinth API ${res.status}: ${body}`.slice(0, 200))
  }
  return res.json() as Promise<T>
}

// --- Antwort-Typen (nur die genutzten Felder) -------------------------------

export interface ModrinthSearchHit {
  project_id: string
  slug: string
  title: string
  description: string
  author: string
  downloads: number
  icon_url?: string
  project_type: string
}

export interface ModrinthFile {
  url: string
  filename: string
  primary: boolean
  size: number
  hashes?: { sha1?: string; sha512?: string }
}

export interface ModrinthDependency {
  project_id?: string
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  game_versions: string[]
  loaders: string[]
  files: ModrinthFile[]
  dependencies: ModrinthDependency[]
}

export function mapHit(h: ModrinthSearchHit): ModSearchHit {
  const projectType: ModProjectType = h.project_type === 'modpack' ? 'modpack' : 'mod'
  return {
    projectId: h.project_id,
    slug: h.slug,
    title: h.title,
    description: h.description,
    author: h.author,
    downloads: h.downloads,
    iconUrl: h.icon_url || undefined,
    projectType
  }
}

/**
 * Baut eine Modrinth-`facets`-Suche und liefert die gemappten Treffer.
 * `offset` blättert seitenweise (Seitengröße = MOD_SEARCH_PAGE_SIZE).
 */
export async function searchProjects(
  query: string,
  facets: string[][],
  offset = 0
): Promise<ModSearchHit[]> {
  const params = new URLSearchParams({
    query,
    limit: String(MOD_SEARCH_PAGE_SIZE),
    offset: String(Math.max(0, offset)),
    index: 'relevance',
    facets: JSON.stringify(facets)
  })
  const data = await modrinthGet<{ hits: ModrinthSearchHit[] }>(`/search?${params}`)
  return data.hits.map(mapHit)
}

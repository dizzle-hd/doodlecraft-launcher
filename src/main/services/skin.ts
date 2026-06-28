import type { SkinData } from '@shared/ipc'

const SESSION_PROFILE = 'https://sessionserver.mojang.com/session/minecraft/profile/'

interface MojangProfile {
  name?: string
  properties?: { name: string; value: string }[]
}
interface TexturePayload {
  textures?: { SKIN?: { url?: string; metadata?: { model?: string } } }
}

/**
 * Holt die Skin-Textur eines Spielers von Mojang: Profil (Session-Server) ->
 * Texturen dekodieren -> Skin-PNG laden -> als data:-URL zurückgeben. So muss
 * der Renderer nichts Externes laden (CORS/CSP-sicher).
 */
export async function fetchSkin(uuid: string): Promise<SkinData | null> {
  const clean = uuid.replace(/-/g, '')
  if (!/^[0-9a-fA-F]{32}$/.test(clean)) return null

  const res = await fetch(SESSION_PROFILE + clean)
  if (!res.ok) return null
  const profile = (await res.json()) as MojangProfile

  const tex = profile.properties?.find((p) => p.name === 'textures')
  if (!tex) return null
  const decoded = JSON.parse(
    Buffer.from(tex.value, 'base64').toString('utf8')
  ) as TexturePayload

  const skin = decoded.textures?.SKIN
  if (!skin?.url) return null

  const img = await fetch(skin.url)
  if (!img.ok) return null
  const buf = Buffer.from(await img.arrayBuffer())

  return {
    dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
    slim: skin.metadata?.model === 'slim',
    name: profile.name
  }
}

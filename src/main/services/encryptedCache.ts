import { safeStorage } from 'electron'
import { join } from 'path'
import { createHash } from 'crypto'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync
} from 'fs'

/**
 * Cache-Implementierung für prismarine-auth, die die Token-JSONs mit Electrons
 * `safeStorage` (OS-Schlüsselbund/DPAPI) verschlüsselt auf Platte ablegt.
 *
 * prismarine-auth erwartet eine Factory `({ cacheName, username }) => cache`,
 * wobei `cache` die Methoden reset/getCached/setCached/setCachedPartial bietet
 * (vgl. node_modules/prismarine-auth/src/common/cache/FileCache.js).
 *
 * Fällt safeStorage-Verschlüsselung aus (z. B. Linux ohne Keyring), wird
 * transparent unverschlüsselt gespeichert, damit der Login trotzdem klappt.
 */
class EncryptedFileCache {
  private cache: Record<string, unknown> | undefined
  constructor(private readonly file: string) {}

  private canEncrypt(): boolean {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  private read(): Record<string, unknown> {
    try {
      const raw = readFileSync(this.file)
      const text =
        raw[0] === 0x7b /* '{' => unverschlüsselter Fallback */
          ? raw.toString('utf8')
          : safeStorage.decryptString(raw)
      return JSON.parse(text)
    } catch {
      return {}
    }
  }

  private write(value: Record<string, unknown>): void {
    const text = JSON.stringify(value)
    const data = this.canEncrypt()
      ? safeStorage.encryptString(text)
      : Buffer.from(text, 'utf8')
    writeFileSync(this.file, data)
  }

  async reset(): Promise<void> {
    this.cache = {}
    this.write(this.cache)
  }

  async getCached(): Promise<Record<string, unknown>> {
    if (this.cache === undefined) this.cache = this.read()
    return this.cache
  }

  async setCached(cached: Record<string, unknown>): Promise<void> {
    this.cache = cached
    this.write(this.cache)
  }

  async setCachedPartial(partial: Record<string, unknown>): Promise<void> {
    await this.setCached({ ...(this.cache ?? {}), ...partial })
  }
}

export type CacheFactory = (opts: {
  cacheName: string
  username: string
}) => EncryptedFileCache

/** Erzeugt eine an `dir` gebundene Cache-Factory für Authflow. */
export function createEncryptedCacheFactory(dir: string): CacheFactory {
  return ({ cacheName, username }) => {
    const hash = createHash('sha1').update(username).digest('hex').slice(0, 16)
    return new EncryptedFileCache(join(dir, `${hash}_${cacheName}.enc`))
  }
}

/** Löscht alle Cache-Dateien eines Accounts (beim Entfernen/Logout). */
export function clearAccountCache(dir: string, username: string): void {
  const hash = createHash('sha1').update(username).digest('hex').slice(0, 16)
  for (const name of ['live', 'sisu', 'msal', 'xbl', 'bed', 'mca', 'mcs', 'pfb']) {
    const file = join(dir, `${hash}_${name}.enc`)
    if (existsSync(file)) {
      try {
        rmSync(file)
      } catch {
        /* ignore */
      }
    }
  }
}

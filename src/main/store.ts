import Store from 'electron-store'
import type { Account, LauncherSettings } from '@shared/ipc'

interface StoreSchema {
  accounts: Account[]
  activeAccountId: string | null
  settings: LauncherSettings
}

const defaults: StoreSchema = {
  accounts: [],
  activeAccountId: null,
  settings: {
    maxMemoryMb: 4096,
    javaPath: '',
    showSnapshots: false
  }
}

/**
 * Persistenter App-Zustand (Accounts-Metadaten + Einstellungen). Die geheimen
 * Tokens liegen NICHT hier, sondern verschlüsselt im auth-cache (siehe
 * services/encryptedCache.ts).
 */
export const store = new Store<StoreSchema>({ defaults })

/** Aktuelle Einstellungen. */
export function getSettings(): LauncherSettings {
  return store.get('settings')
}

/** Teil-Update der Einstellungen; liefert den neuen Stand. */
export function updateSettings(patch: Partial<LauncherSettings>): LauncherSettings {
  const next = { ...store.get('settings'), ...patch }
  store.set('settings', next)
  return next
}

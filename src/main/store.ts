import Store from 'electron-store'
import type { Account } from '@shared/ipc'

export interface LauncherSettings {
  /** Maximaler Java-Heap in MB. */
  maxMemoryMb: number
  /** Optionaler manueller Java-Pfad (leer = automatisch beschaffen). */
  javaPath: string
  /** Snapshots in der Versionsliste anzeigen. */
  showSnapshots: boolean
}

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

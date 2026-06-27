import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

/**
 * Zentrale Verzeichnisstruktur des Launchers unterhalb von userData.
 *
 *   <userData>/
 *     auth-cache/      verschlüsselte Token-Caches (prismarine-auth)
 *     minecraft/       gemeinsame Assets/Libraries/Versions
 *     instances/       eine Unterordner pro Instanz
 *     java/            beschaffte Java-Runtimes
 */
function ensure(dir: string): string {
  mkdirSync(dir, { recursive: true })
  return dir
}

export const paths = {
  get root(): string {
    return app.getPath('userData')
  },
  get authCache(): string {
    return ensure(join(app.getPath('userData'), 'auth-cache'))
  },
  get minecraft(): string {
    return ensure(join(app.getPath('userData'), 'minecraft'))
  },
  get instances(): string {
    return ensure(join(app.getPath('userData'), 'instances'))
  },
  get java(): string {
    return ensure(join(app.getPath('userData'), 'java'))
  }
}

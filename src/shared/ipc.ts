/**
 * Zentrale IPC-Contracts zwischen Main- und Renderer-Prozess.
 *
 * Jeder Eintrag in `IpcInvokeMap` beschreibt einen `ipcRenderer.invoke`-Aufruf
 * (Renderer -> Main, mit Rückgabewert). Jeder Eintrag in `IpcEventMap` beschreibt
 * einen Push vom Main an den Renderer (z. B. Fortschritt, Login-Code, Logs).
 *
 * Die Maps werden sowohl für die typsichere preload-Bridge als auch für die
 * Handler-Registrierung im Main genutzt, damit Channel-Namen und Signaturen
 * nicht auseinanderlaufen.
 */

export interface AppInfo {
  appVersion: string
  electronVersion: string
  platform: NodeJS.Platform
}

// ---------------------------------------------------------------------------
// Auth / Accounts
// ---------------------------------------------------------------------------

export type AccountType = 'microsoft' | 'offline'

export interface Account {
  /** Interne, stabile ID (bei Microsoft zugleich der prismarine-auth Cache-Key). */
  id: string
  type: AccountType
  /** Minecraft-Benutzername. */
  name: string
  /** Minecraft-UUID (ohne Bindestriche, wie von der Mojang-API geliefert). */
  uuid: string
  addedAt: number
}

/** Wird während des Device-Code-Logins an den Renderer gepusht. */
export interface DeviceCodeInfo {
  userCode: string
  verificationUri: string
  /** Direkt-Link inkl. vorausgefülltem Code. */
  directUri: string
  expiresInSeconds: number
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

export interface LauncherSettings {
  /** Maximaler Java-Heap in MB. */
  maxMemoryMb: number
  /** Optionaler manueller Java-Pfad (leer = automatisch beschaffen). */
  javaPath: string
  /** Snapshots in der Versionsliste anzeigen. */
  showSnapshots: boolean
}

// ---------------------------------------------------------------------------
// Versionen & Instanzen
// ---------------------------------------------------------------------------

/** Kompakter Eintrag der Mojang-Versionsliste (für die Auswahl-Combo). */
export interface VersionSummary {
  id: string
  /** z. B. `release`, `snapshot`, `old_beta`. */
  type: string
  releaseTime: string
}

export interface VersionList {
  latestRelease: string
  latestSnapshot: string
  versions: VersionSummary[]
}

/** Unterstützte Mod-Loader (M6). */
export type LoaderType = 'fabric' | 'forge' | 'quilt'

/** Eine Spiel-Instanz (eigener Ordner unter paths.instances/<id>/). */
export interface Instance {
  /** Stabiler Slug = zugleich der Ordnername. */
  id: string
  name: string
  mcVersion: string
  /** Mod-Loader (M6); fehlt = Vanilla. */
  loader?: LoaderType
  loaderVersion?: string
  /**
   * Die tatsächlich zu startende Versions-ID. Bei Loadern die abgeleitete
   * Version (z. B. `1.20.1-fabric0.15.0`), bei Vanilla undefiniert (= mcVersion).
   */
  launchVersion?: string
  /** Mojang-Java-Komponente, die für den Start gebraucht wird (z. B. java-runtime-gamma). */
  javaComponent?: string
  /** true, sobald alle Dateien (inkl. Loader) vollständig installiert sind. */
  installed: boolean
  createdAt: number
  lastPlayed?: number
}

export interface CreateInstanceInput {
  name: string
  mcVersion: string
  loader?: LoaderType
  /** Optional; leer = beim Installieren neueste/empfohlene Version wählen. */
  loaderVersion?: string
}

/** Eine wählbare Loader-Version (für die UI-Combo). */
export interface LoaderVersion {
  version: string
  /** Als stabil markiert (Fabric/Quilt) bzw. recommended/common (Forge). */
  stable?: boolean
  /** Forge: ausdrücklich „recommended". */
  recommended?: boolean
}

/** Fortschritts-Push während einer Installation. */
export interface InstallProgress {
  instanceId: string
  /** Aktuelle Phase des Vorgangs. */
  phase: 'minecraft' | 'java' | 'loader' | 'done' | 'error'
  /** 0..1. */
  progress: number
  /** Menschliche Kurzbeschreibung (z. B. aktueller Task-Pfad). */
  label?: string
  /** Nur bei `phase === 'error'`. */
  error?: string
}

// ---------------------------------------------------------------------------
// Mods & Modpacks (M7, Modrinth)
// ---------------------------------------------------------------------------

export type ModProjectType = 'mod' | 'modpack'

/** Ein Suchtreffer aus der Modrinth-Suche (Mod oder Modpack). */
export interface ModSearchHit {
  projectId: string
  slug: string
  title: string
  description: string
  author: string
  downloads: number
  iconUrl?: string
  projectType: ModProjectType
}

/** Eine in einer Instanz installierte Mod-Datei. */
export interface InstalledMod {
  /** Tatsächlicher Dateiname im mods-Ordner (ggf. mit `.disabled`). */
  fileName: string
  enabled: boolean
  size: number
  /** Best-effort-Metadaten aus dem Install-Index. */
  name?: string
  projectId?: string
  version?: string
}

/** Neue Log-Zeilen aus einem laufenden Spielprozess. */
export interface LogChunk {
  instanceId: string
  lines: string[]
}

/** Status-Push während/nach dem Spielstart (M5). */
export interface LaunchStatus {
  instanceId: string
  /**
   * `launching` = Prozess wird vorbereitet/gestartet, `running` = MC-Fenster da,
   * `exited` = Prozess beendet, `error` = Start fehlgeschlagen (z. B. Java fehlt).
   */
  state: 'launching' | 'running' | 'exited' | 'error'
  /** Exit-Code (nur bei `exited`). */
  code?: number
  /** Pfad zum Crash-Report, falls vorhanden. */
  crashReportLocation?: string
  /** Fehlermeldung (bei `error` bzw. Crash). */
  error?: string
}

// ---------------------------------------------------------------------------

/** Renderer -> Main (invoke), Schlüssel = Channel-Name. */
export interface IpcInvokeMap {
  'app:getInfo': {
    args: []
    result: AppInfo
  }
  'app:ping': {
    args: [message: string]
    result: string
  }

  'auth:list': {
    args: []
    result: Account[]
  }
  'auth:getActive': {
    args: []
    result: Account | null
  }
  'auth:setActive': {
    args: [accountId: string]
    result: Account[]
  }
  'auth:remove': {
    args: [accountId: string]
    result: Account[]
  }
  /** Startet den Microsoft Device-Code-Login. Löst mit dem neuen Account auf. */
  'auth:loginMicrosoft': {
    args: []
    result: Account
  }
  'auth:addOffline': {
    args: [name: string]
    result: Account
  }

  'settings:get': {
    args: []
    result: LauncherSettings
  }
  'settings:update': {
    args: [patch: Partial<LauncherSettings>]
    result: LauncherSettings
  }

  /** Mojang-Versionsliste (gefiltert nach Setting `showSnapshots`). */
  'versions:list': {
    args: []
    result: VersionList
  }
  /** Verfügbare Loader-Versionen für einen Loader-Typ + MC-Version. */
  'loaders:list': {
    args: [loader: LoaderType, mcVersion: string]
    result: LoaderVersion[]
  }

  'instances:list': {
    args: []
    result: Instance[]
  }
  'instances:create': {
    args: [input: CreateInstanceInput]
    result: Instance
  }
  'instances:delete': {
    args: [instanceId: string]
    result: Instance[]
  }
  'instances:rename': {
    args: [instanceId: string, name: string]
    result: Instance[]
  }
  /** Öffnet den Instanz-Ordner im Datei-Explorer des Systems. */
  'instances:openFolder': {
    args: [instanceId: string]
    result: void
  }
  'instances:duplicate': {
    args: [instanceId: string]
    result: Instance[]
  }
  /**
   * Installiert (oder vervollständigt) Vanilla + passende Java-Runtime der
   * Instanz. Fortschritt kommt über das Event `install:progress`.
   */
  'instances:install': {
    args: [instanceId: string]
    result: Instance
  }
  /**
   * Startet die Instanz mit dem aktiven Account. Löst auf, sobald der Prozess
   * gespawnt ist; der weitere Verlauf kommt über das Event `launch:status`.
   */
  'instances:launch': {
    args: [instanceId: string]
    result: Instance
  }
  /** IDs aller aktuell laufenden Instanzen. */
  'instances:running': {
    args: []
    result: string[]
  }
  /** Bisher gepufferte Log-Zeilen einer Instanz (für die Logs-Ansicht). */
  'logs:get': {
    args: [instanceId: string]
    result: string[]
  }
  /** Leert den Log-Puffer einer Instanz. */
  'logs:clear': {
    args: [instanceId: string]
    result: void
  }

  /** Modrinth-Mod-Suche, gefiltert nach Loader + MC-Version der Instanz. */
  'mods:search': {
    args: [instanceId: string, query: string]
    result: ModSearchHit[]
  }
  'mods:install': {
    args: [instanceId: string, projectId: string]
    result: InstalledMod[]
  }
  'mods:list': {
    args: [instanceId: string]
    result: InstalledMod[]
  }
  'mods:remove': {
    args: [instanceId: string, fileName: string]
    result: InstalledMod[]
  }
  'mods:setEnabled': {
    args: [instanceId: string, fileName: string, enabled: boolean]
    result: InstalledMod[]
  }

  /** Modrinth-Modpack-Suche. */
  'modpacks:search': {
    args: [query: string]
    result: ModSearchHit[]
  }
  /**
   * Installiert ein Modrinth-Modpack als neue Instanz. Fortschritt der
   * enthaltenen Vanilla-/Loader-Installation kommt über `install:progress`.
   */
  'modpacks:install': {
    args: [projectId: string]
    result: Instance
  }
}

/** Main -> Renderer (Push-Events), Schlüssel = Channel-Name. */
export interface IpcEventMap {
  'auth:deviceCode': DeviceCodeInfo
  'install:progress': InstallProgress
  'launch:status': LaunchStatus
  'launch:log': LogChunk
}

export type IpcInvokeChannel = keyof IpcInvokeMap
export type IpcEventChannel = keyof IpcEventMap

export type InvokeArgs<C extends IpcInvokeChannel> = IpcInvokeMap[C]['args']
export type InvokeResult<C extends IpcInvokeChannel> = IpcInvokeMap[C]['result']
export type EventPayload<C extends IpcEventChannel> = IpcEventMap[C]

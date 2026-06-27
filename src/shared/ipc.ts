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
}

/** Main -> Renderer (Push-Events), Schlüssel = Channel-Name. */
export interface IpcEventMap {
  'auth:deviceCode': DeviceCodeInfo
}

export type IpcInvokeChannel = keyof IpcInvokeMap
export type IpcEventChannel = keyof IpcEventMap

export type InvokeArgs<C extends IpcInvokeChannel> = IpcInvokeMap[C]['args']
export type InvokeResult<C extends IpcInvokeChannel> = IpcInvokeMap[C]['result']
export type EventPayload<C extends IpcEventChannel> = IpcEventMap[C]

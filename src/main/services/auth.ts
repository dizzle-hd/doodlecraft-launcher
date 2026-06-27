import { randomUUID } from 'crypto'
import { Authflow, Titles, type CacheFactory } from 'prismarine-auth'
import { offline } from '@xmcl/user'
import type { Account, DeviceCodeInfo } from '@shared/ipc'
import { store } from '../store'
import { paths } from '../paths'
import {
  createEncryptedCacheFactory,
  clearAccountCache
} from './encryptedCache'

/** Token + Profildaten, wie sie für den Spielstart (M5) gebraucht werden. */
export interface LaunchAuth {
  accessToken: string
  uuid: string
  name: string
  userType: 'msa' | 'legacy'
}

const PUBLIC_TITLE = Titles.MinecraftNintendoSwitch // öffentliche Client-ID

function cacheFactory(): CacheFactory {
  // Eigene Factory ist strukturell zur prismarine-auth Cache-API kompatibel.
  return createEncryptedCacheFactory(paths.authCache) as unknown as CacheFactory
}

function makeFlow(
  cacheKey: string,
  onCode?: (info: DeviceCodeInfo) => void
): Authflow {
  return new Authflow(
    cacheKey,
    cacheFactory(),
    { flow: 'live', authTitle: PUBLIC_TITLE, deviceType: 'Win32' },
    (res) => {
      onCode?.({
        userCode: res.user_code,
        verificationUri: res.verification_uri,
        directUri: `https://www.microsoft.com/link?otc=${res.user_code}`,
        expiresInSeconds: res.expires_in
      })
    }
  )
}

// --- Account-Persistenz -----------------------------------------------------

export function listAccounts(): Account[] {
  return store.get('accounts')
}

export function getActiveAccount(): Account | null {
  const id = store.get('activeAccountId')
  if (!id) return null
  return store.get('accounts').find((a) => a.id === id) ?? null
}

export function setActiveAccount(accountId: string): Account[] {
  const accounts = store.get('accounts')
  if (accounts.some((a) => a.id === accountId)) {
    store.set('activeAccountId', accountId)
  }
  return accounts
}

export function removeAccount(accountId: string): Account[] {
  const accounts = store.get('accounts')
  const target = accounts.find((a) => a.id === accountId)
  if (target?.type === 'microsoft') {
    clearAccountCache(paths.authCache, target.id)
  }
  const next = accounts.filter((a) => a.id !== accountId)
  store.set('accounts', next)
  if (store.get('activeAccountId') === accountId) {
    store.set('activeAccountId', next[0]?.id ?? null)
  }
  return next
}

function upsertAccount(account: Account): void {
  const accounts = store.get('accounts')
  // Doppelte (gleiche UUID) ersetzen, damit Caches nicht verwaisen.
  const filtered = accounts.filter((a) => {
    if (a.uuid === account.uuid) {
      if (a.type === 'microsoft' && a.id !== account.id) {
        clearAccountCache(paths.authCache, a.id)
      }
      return false
    }
    return true
  })
  filtered.push(account)
  store.set('accounts', filtered)
  store.set('activeAccountId', account.id)
}

// --- Login-Flows ------------------------------------------------------------

/**
 * Microsoft Device-Code-Login über die öffentliche Client-ID (keine eigene
 * Azure-App). `onCode` wird aufgerufen, sobald der Anmeldecode bereitsteht.
 */
export async function loginMicrosoft(
  onCode: (info: DeviceCodeInfo) => void
): Promise<Account> {
  const cacheKey = randomUUID()
  const flow = makeFlow(cacheKey, onCode)
  const result = await flow.getMinecraftJavaToken({ fetchProfile: true })

  if (!result.profile?.id) {
    throw new Error(
      'Kein Minecraft-Profil gefunden. Besitzt dieser Microsoft-Account Minecraft: Java Edition?'
    )
  }

  const account: Account = {
    id: cacheKey,
    type: 'microsoft',
    name: result.profile.name,
    uuid: result.profile.id,
    addedAt: Date.now()
  }
  upsertAccount(account)
  return account
}

/** Legt einen Offline-Account an (nur Singleplayer/Offline-Server). */
export function addOfflineAccount(name: string): Account {
  const trimmed = name.trim()
  if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) {
    throw new Error('Ungültiger Name (3–16 Zeichen: Buchstaben, Zahlen, _).')
  }
  const session = offline(trimmed)
  const account: Account = {
    id: `offline:${session.selectedProfile.id}`,
    type: 'offline',
    name: session.selectedProfile.name,
    uuid: session.selectedProfile.id,
    addedAt: Date.now()
  }
  upsertAccount(account)
  return account
}

/**
 * Liefert einen frischen Spiel-Token für den Start. Bei Microsoft-Accounts
 * wird das Token bei Bedarf still über den verschlüsselten Cache erneuert.
 */
export async function getLaunchAuth(accountId: string): Promise<LaunchAuth> {
  const account = store.get('accounts').find((a) => a.id === accountId)
  if (!account) throw new Error('Account nicht gefunden.')

  if (account.type === 'offline') {
    const session = offline(account.name)
    return {
      accessToken: session.accessToken,
      uuid: account.uuid,
      name: account.name,
      userType: 'legacy'
    }
  }

  const flow = makeFlow(account.id)
  const result = await flow.getMinecraftJavaToken({ fetchProfile: true })
  return {
    accessToken: result.token,
    uuid: result.profile?.id ?? account.uuid,
    name: result.profile?.name ?? account.name,
    userType: 'msa'
  }
}

import { randomUUID } from 'crypto'
import { Authflow, Titles, type CacheFactory } from 'prismarine-auth'
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
  userType: 'msa'
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
    // deviceType MUSS zum Title passen (Nintendo Switch -> 'Nintendo'),
    // sonst lehnt Xbox die Title-/Device-Auth mit 403 Forbidden ab.
    { flow: 'live', authTitle: PUBLIC_TITLE, deviceType: 'Nintendo' },
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

/**
 * Entfernt evtl. aus früheren Versionen noch vorhandene Offline-Accounts und
 * persistiert das Ergebnis. Offline-Accounts werden nicht mehr unterstützt.
 */
function pruneNonMicrosoft(): Account[] {
  const accounts = store.get('accounts')
  const microsoft = accounts.filter((a) => a.type === 'microsoft')
  if (microsoft.length !== accounts.length) {
    store.set('accounts', microsoft)
    const active = store.get('activeAccountId')
    if (!microsoft.some((a) => a.id === active)) {
      store.set('activeAccountId', microsoft[0]?.id ?? null)
    }
  }
  return microsoft
}

export function listAccounts(): Account[] {
  return pruneNonMicrosoft()
}

export function getActiveAccount(): Account | null {
  const accounts = pruneNonMicrosoft()
  const id = store.get('activeAccountId')
  if (!id) return null
  return accounts.find((a) => a.id === id) ?? null
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

/**
 * Liefert einen frischen Spiel-Token für den Start. Das Token wird bei Bedarf
 * still über den verschlüsselten Cache erneuert.
 */
export async function getLaunchAuth(accountId: string): Promise<LaunchAuth> {
  const account = store.get('accounts').find((a) => a.id === accountId)
  if (!account) throw new Error('Account nicht gefunden.')

  const flow = makeFlow(account.id)
  const result = await flow.getMinecraftJavaToken({ fetchProfile: true })
  return {
    accessToken: result.token,
    uuid: result.profile?.id ?? account.uuid,
    name: result.profile?.name ?? account.name,
    userType: 'msa'
  }
}

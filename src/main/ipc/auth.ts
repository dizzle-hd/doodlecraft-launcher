import { handle, emit } from './registry'
import {
  listAccounts,
  getActiveAccount,
  setActiveAccount,
  removeAccount,
  loginMicrosoft
} from '../services/auth'

/** IPC-Handler rund um Accounts/Login. */
export function registerAuthHandlers(): void {
  handle('auth:list', () => listAccounts())
  handle('auth:getActive', () => getActiveAccount())
  handle('auth:setActive', (_ctx, accountId) => setActiveAccount(accountId))
  handle('auth:remove', (_ctx, accountId) => removeAccount(accountId))

  handle('auth:loginMicrosoft', (ctx) =>
    loginMicrosoft((info) => emit(ctx.sender, 'auth:deviceCode', info))
  )
}

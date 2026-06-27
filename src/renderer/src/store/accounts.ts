import { create } from 'zustand'
import type { Account } from '@shared/ipc'

interface AccountState {
  accounts: Account[]
  activeId: string | null
  loaded: boolean
  refresh: () => Promise<void>
  setActive: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  addOffline: (name: string) => Promise<Account>
  loginMicrosoft: () => Promise<Account>
}

/** Spiegelt die Account-Liste aus dem Main-Prozess in den Renderer. */
export const useAccounts = create<AccountState>((set) => {
  const reload = async (): Promise<void> => {
    const [accounts, active] = await Promise.all([
      window.api.invoke('auth:list'),
      window.api.invoke('auth:getActive')
    ])
    set({ accounts, activeId: active?.id ?? null, loaded: true })
  }

  return {
    accounts: [],
    activeId: null,
    loaded: false,
    refresh: reload,
    setActive: async (id) => {
      await window.api.invoke('auth:setActive', id)
      await reload()
    },
    remove: async (id) => {
      await window.api.invoke('auth:remove', id)
      await reload()
    },
    addOffline: async (name) => {
      const account = await window.api.invoke('auth:addOffline', name)
      await reload()
      return account
    },
    loginMicrosoft: async () => {
      const account = await window.api.invoke('auth:loginMicrosoft')
      await reload()
      return account
    }
  }
})

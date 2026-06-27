import { create } from 'zustand'
import type {
  CreateInstanceInput,
  Instance,
  InstallProgress,
  LaunchStatus,
  LauncherSettings,
  VersionList
} from '@shared/ipc'

interface InstancesState {
  instances: Instance[]
  versions: VersionList | null
  settings: LauncherSettings | null
  loaded: boolean
  /** Laufender Installations-Fortschritt je Instanz-ID. */
  progress: Record<string, InstallProgress>
  /** Zuletzt gemeldeter Start-Status je Instanz-ID. */
  launchStatus: Record<string, LaunchStatus>
  refresh: () => Promise<void>
  loadVersions: () => Promise<void>
  setShowSnapshots: (value: boolean) => Promise<void>
  create: (input: CreateInstanceInput) => Promise<Instance>
  remove: (id: string) => Promise<void>
  duplicate: (id: string) => Promise<void>
  rename: (id: string, name: string) => Promise<void>
  openFolder: (id: string) => Promise<void>
  install: (id: string) => Promise<void>
  launch: (id: string) => Promise<void>
  setProgress: (p: InstallProgress) => void
  setLaunchStatus: (s: LaunchStatus) => void
}

/** Spiegelt Instanzen, Versionen und Einstellungen aus dem Main-Prozess. */
export const useInstances = create<InstancesState>((set, get) => {
  const reload = async (): Promise<void> => {
    const [instances, settings, runningIds] = await Promise.all([
      window.api.invoke('instances:list'),
      window.api.invoke('settings:get'),
      window.api.invoke('instances:running')
    ])
    set((s) => {
      // Start-Status mit der tatsächlich laufenden Liste abgleichen.
      const launchStatus = { ...s.launchStatus }
      for (const inst of instances) {
        const isRunning = runningIds.includes(inst.id)
        const known = launchStatus[inst.id]
        if (isRunning && (!known || (known.state !== 'launching' && known.state !== 'running'))) {
          launchStatus[inst.id] = { instanceId: inst.id, state: 'running' }
        }
      }
      return { instances, settings, loaded: true, launchStatus }
    })
  }

  return {
    instances: [],
    versions: null,
    settings: null,
    loaded: false,
    progress: {},
    launchStatus: {},

    refresh: reload,

    loadVersions: async () => {
      const versions = await window.api.invoke('versions:list')
      set({ versions })
    },

    setShowSnapshots: async (value) => {
      const settings = await window.api.invoke('settings:update', {
        showSnapshots: value
      })
      set({ settings })
      // Versionsliste hängt vom Setting ab -> neu laden.
      const versions = await window.api.invoke('versions:list')
      set({ versions })
    },

    create: async (input) => {
      const instance = await window.api.invoke('instances:create', input)
      await reload()
      return instance
    },

    remove: async (id) => {
      await window.api.invoke('instances:delete', id)
      await reload()
    },

    duplicate: async (id) => {
      await window.api.invoke('instances:duplicate', id)
      await reload()
    },

    rename: async (id, name) => {
      await window.api.invoke('instances:rename', id, name)
      await reload()
    },

    openFolder: async (id) => {
      await window.api.invoke('instances:openFolder', id)
    },

    install: async (id) => {
      try {
        await window.api.invoke('instances:install', id)
        // Nur bei Erfolg den Fortschritt aufräumen.
        await reload()
        const { [id]: _done, ...rest } = get().progress
        set({ progress: rest })
      } catch (e) {
        // Bei Fehler den Fortschritt (phase 'error') sichtbar lassen.
        await reload()
        throw e
      }
    },

    launch: async (id) => {
      try {
        await window.api.invoke('instances:launch', id)
      } finally {
        await reload()
      }
    },

    setProgress: (p) => {
      set((s) => ({ progress: { ...s.progress, [p.instanceId]: p } }))
    },

    setLaunchStatus: (s) => {
      set((state) => ({
        launchStatus: { ...state.launchStatus, [s.instanceId]: s }
      }))
    }
  }
})

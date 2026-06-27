import { create } from 'zustand'
import type {
  CreateInstanceInput,
  Instance,
  InstallProgress,
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
  refresh: () => Promise<void>
  loadVersions: () => Promise<void>
  setShowSnapshots: (value: boolean) => Promise<void>
  create: (input: CreateInstanceInput) => Promise<Instance>
  remove: (id: string) => Promise<void>
  duplicate: (id: string) => Promise<void>
  install: (id: string) => Promise<void>
  setProgress: (p: InstallProgress) => void
}

/** Spiegelt Instanzen, Versionen und Einstellungen aus dem Main-Prozess. */
export const useInstances = create<InstancesState>((set, get) => {
  const reload = async (): Promise<void> => {
    const [instances, settings] = await Promise.all([
      window.api.invoke('instances:list'),
      window.api.invoke('settings:get')
    ])
    set({ instances, settings, loaded: true })
  }

  return {
    instances: [],
    versions: null,
    settings: null,
    loaded: false,
    progress: {},

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

    install: async (id) => {
      try {
        await window.api.invoke('instances:install', id)
      } finally {
        await reload()
        // Fortschritts-Eintrag nach Abschluss aufräumen.
        const { [id]: _done, ...rest } = get().progress
        set({ progress: rest })
      }
    },

    setProgress: (p) => {
      set((s) => ({ progress: { ...s.progress, [p.instanceId]: p } }))
    }
  }
})

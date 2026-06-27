import { join } from 'path'
import { existsSync, readdirSync } from 'fs'
import type { WebContents } from 'electron'
import {
  installTask,
  fetchJavaRuntimeManifest,
  installJavaRuntimeTask
} from '@xmcl/installer'
import { TaskState, type Task, type TaskContext } from '@xmcl/task'
import type { ResolvedVersion } from '@xmcl/core'
import { paths } from '../paths'
import { emit } from '../ipc/registry'
import type { Instance, InstallProgress } from '@shared/ipc'
import { getVersionMeta } from './versions'
import { patchInstance, readInstanceOrThrow } from './instances'

function send(sender: WebContents, payload: InstallProgress): void {
  emit(sender, 'install:progress', payload)
}

/** 0..1-Fortschritt eines Root-Tasks, robust gegen total === 0. */
function ratio(task: Task): number {
  if (!task.total || task.total <= 0) return 0
  return Math.max(0, Math.min(1, task.progress / task.total))
}

/**
 * Beobachtet einen @xmcl-Task und pusht den Gesamtfortschritt des Root-Tasks
 * als `install:progress` an den Renderer.
 */
async function runTracked<T>(
  sender: WebContents,
  instanceId: string,
  phase: InstallProgress['phase'],
  rootTask: Task<T>
): Promise<T> {
  let last = -1
  const report = (): void => {
    const progress = ratio(rootTask)
    // Nur bei spürbarer Änderung senden, um den IPC-Kanal nicht zu fluten.
    if (Math.abs(progress - last) < 0.005 && rootTask.state === TaskState.Running) {
      return
    }
    last = progress
    send(sender, { instanceId, phase, progress, label: rootTask.path })
  }
  const ctx: TaskContext = {
    onStart: report,
    onUpdate: report,
    onSucceed: report
  }
  return rootTask.startAndWait(ctx)
}

/** Best-effort: Pfad der java-Binary innerhalb eines Runtime-Ordners. */
function findJavaBinary(runtimeDir: string): string | null {
  const candidates =
    process.platform === 'win32'
      ? [join(runtimeDir, 'bin', 'javaw.exe'), join(runtimeDir, 'bin', 'java.exe')]
      : process.platform === 'darwin'
        ? [join(runtimeDir, 'jre.bundle', 'Contents', 'Home', 'bin', 'java')]
        : [join(runtimeDir, 'bin', 'java')]
  return candidates.find((p) => existsSync(p)) ?? null
}

function runtimeInstalled(runtimeDir: string): boolean {
  try {
    return existsSync(runtimeDir) && readdirSync(runtimeDir).length > 0
  } catch {
    return false
  }
}

/**
 * Beschafft die zur Version passende Java-Runtime von Mojang nach
 * `paths.java/<component>`. Fehler hier sind nicht fatal (Vanilla ist bereits
 * installiert) — sie werden gemeldet, der Start in M5 kann erneut versorgen.
 */
async function provisionJava(
  sender: WebContents,
  instanceId: string,
  resolved: ResolvedVersion
): Promise<string | undefined> {
  const component = resolved.javaVersion?.component ?? 'jre-legacy'
  const runtimeDir = join(paths.java, component)

  if (!runtimeInstalled(runtimeDir)) {
    send(sender, { instanceId, phase: 'java', progress: 0, label: component })
    const manifest = await fetchJavaRuntimeManifest({ target: component })
    const javaTask = installJavaRuntimeTask({
      destination: runtimeDir,
      manifest,
      // Rohformat herunterladen, damit kein LZMA-Entpacker nötig ist.
      lzma: false
    })
    await runTracked(sender, instanceId, 'java', javaTask)
  } else {
    send(sender, { instanceId, phase: 'java', progress: 1, label: component })
  }

  // Komponente merken; konkreter Binary-Pfad wird in M5 aufgelöst.
  findJavaBinary(runtimeDir)
  return component
}

/**
 * Installiert (bzw. vervollständigt) eine Instanz: Vanilla-Version inkl.
 * Assets/Libraries in den gemeinsamen `paths.minecraft` plus passende Java-
 * Runtime. Markiert die Instanz anschließend als `installed`.
 */
export async function installInstance(
  sender: WebContents,
  instanceId: string
): Promise<Instance> {
  const instance = readInstanceOrThrow(instanceId)

  try {
    const versionMeta = await getVersionMeta(instance.mcVersion)

    send(sender, { instanceId, phase: 'minecraft', progress: 0, label: instance.mcVersion })
    const rootTask = installTask(versionMeta, paths.minecraft, { side: 'client' })
    const resolved = await runTracked(sender, instanceId, 'minecraft', rootTask)

    const javaComponent = await provisionJava(sender, instanceId, resolved)

    const updated = patchInstance(instanceId, { installed: true, javaComponent })
    send(sender, { instanceId, phase: 'done', progress: 1 })
    return updated
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    send(sender, { instanceId, phase: 'error', progress: 0, error })
    throw e
  }
}

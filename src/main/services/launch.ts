import { existsSync } from 'fs'
import type { ChildProcess } from 'child_process'
import type { Readable } from 'stream'
import type { WebContents } from 'electron'
import { launch, createMinecraftProcessWatcher, type LaunchOption } from '@xmcl/core'
import { paths } from '../paths'
import { emit } from '../ipc/registry'
import { getSettings } from '../store'
import { getActiveAccount, getLaunchAuth } from './auth'
import { instanceDir, patchInstance, readInstanceOrThrow } from './instances'
import { resolveJavaBinary } from './install'
import type { Instance, LaunchStatus } from '@shared/ipc'

/** Laufende Prozesse je Instanz-ID, um Doppelstarts zu verhindern. */
const running = new Map<string, ChildProcess>()

/** Ringpuffer der letzten Log-Zeilen je Instanz (für die Logs-Ansicht). */
const logs = new Map<string, string[]>()
const MAX_LOG_LINES = 3000

export function runningInstanceIds(): string[] {
  return [...running.keys()]
}

/** Bisher gepufferte Log-Zeilen einer Instanz. */
export function getLogs(instanceId: string): string[] {
  return logs.get(instanceId) ?? []
}

/** Leert den Log-Puffer einer Instanz. */
export function clearLogs(instanceId: string): void {
  logs.delete(instanceId)
}

function status(sender: WebContents, payload: LaunchStatus): void {
  emit(sender, 'launch:status', payload)
}

/** Hängt Zeilen an den Puffer (gedeckelt) und pusht sie an den Renderer. */
function pushLogLines(sender: WebContents, instanceId: string, lines: string[]): void {
  if (lines.length === 0) return
  const buffer = logs.get(instanceId) ?? []
  buffer.push(...lines)
  if (buffer.length > MAX_LOG_LINES) {
    buffer.splice(0, buffer.length - MAX_LOG_LINES)
  }
  logs.set(instanceId, buffer)
  emit(sender, 'launch:log', { instanceId, lines })
}

/**
 * Liest einen stdout/stderr-Stream zeilenweise (mit Übertrag für Teil-Zeilen)
 * und leitet jede Zeile als Log weiter.
 */
function attachLogStream(
  sender: WebContents,
  instanceId: string,
  stream: Readable | null
): void {
  if (!stream) return
  let leftover = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    const parts = (leftover + chunk).split(/\r?\n/)
    leftover = parts.pop() ?? ''
    pushLogLines(sender, instanceId, parts)
  })
  stream.on('end', () => {
    if (leftover) {
      pushLogLines(sender, instanceId, [leftover])
      leftover = ''
    }
  })
}

/**
 * Ermittelt die zu verwendende java-Binary: erst der manuell gesetzte Pfad aus
 * den Einstellungen, sonst die zur Instanz beschaffte Mojang-Runtime.
 */
function resolveJava(instance: Instance): string {
  const manual = getSettings().javaPath.trim()
  if (manual) {
    if (!existsSync(manual)) {
      throw new Error(`Eingestellter Java-Pfad existiert nicht: ${manual}`)
    }
    return manual
  }
  const auto = resolveJavaBinary(instance.javaComponent)
  if (!auto) {
    throw new Error(
      'Keine passende Java-Runtime gefunden. Bitte die Instanz (neu) installieren.'
    )
  }
  return auto
}

/**
 * Startet eine Instanz mit dem aktiven Account. Liefert die (mit `lastPlayed`
 * aktualisierte) Instanz zurück, sobald der Java-Prozess gespawnt ist. Der
 * weitere Verlauf (Fenster da / beendet / Crash) kommt über `launch:status`.
 */
export async function launchInstance(
  sender: WebContents,
  instanceId: string
): Promise<Instance> {
  const instance = readInstanceOrThrow(instanceId)
  if (!instance.installed) {
    throw new Error('Diese Instanz ist noch nicht installiert.')
  }
  if (running.has(instanceId)) {
    throw new Error('Diese Instanz läuft bereits.')
  }

  const account = getActiveAccount()
  if (!account) {
    throw new Error('Kein Account ausgewählt.')
  }

  const settings = getSettings()
  const javaPath = resolveJava(instance)
  const auth = await getLaunchAuth(account.id)

  const option: LaunchOption = {
    // Bei Loadern die abgeleitete Version starten, sonst Vanilla.
    version: instance.launchVersion ?? instance.mcVersion,
    gamePath: instanceDir(instanceId),
    resourcePath: paths.minecraft,
    javaPath,
    gameProfile: { name: auth.name, id: auth.uuid },
    accessToken: auth.accessToken,
    // Microsoft-Accounts: userType weglassen -> @xmcl-Default `msa`.
    ...(auth.userType === 'legacy' ? { userType: 'legacy' as const } : {}),
    maxMemory: settings.maxMemoryMb,
    minMemory: Math.min(512, settings.maxMemoryMb),
    launcherName: 'DoodleCraft',
    launcherBrand: 'DoodleCraft'
  }

  status(sender, { instanceId, state: 'launching' })
  // Frischer Log-Puffer pro Start.
  logs.set(instanceId, [])

  let proc: ChildProcess
  try {
    proc = await launch(option)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    status(sender, { instanceId, state: 'error', error })
    throw e
  }

  running.set(instanceId, proc)
  attachLogStream(sender, instanceId, proc.stdout)
  attachLogStream(sender, instanceId, proc.stderr)
  const updated = patchInstance(instanceId, { lastPlayed: Date.now() })

  const watcher = createMinecraftProcessWatcher(proc)
  watcher.on('error', (err) => {
    running.delete(instanceId)
    status(sender, {
      instanceId,
      state: 'error',
      error: err instanceof Error ? err.message : String(err)
    })
  })
  watcher.on('minecraft-window-ready', () => {
    status(sender, { instanceId, state: 'running' })
  })
  watcher.on('minecraft-exit', ({ code, crashReport, crashReportLocation }) => {
    running.delete(instanceId)
    status(sender, {
      instanceId,
      state: 'exited',
      code,
      crashReportLocation: crashReportLocation || undefined,
      error: code !== 0 && crashReport ? crashReport.slice(0, 800) : undefined
    })
  })

  return updated
}

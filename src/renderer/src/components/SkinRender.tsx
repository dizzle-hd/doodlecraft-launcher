import { useEffect, useRef, useState } from 'react'
import { Spinner } from './ui'

export interface SkinRenderProps {
  uuid: string
  /** Erhöhen, um den Skin neu zu laden (Sync-Button). */
  reloadToken?: number
  height?: number
  /** Grunddrehung um die Y-Achse in Radiant (negativ = leicht nach rechts eingedreht). */
  baseRotation?: number
  /** Kamera-Zoom (kleiner = weiter weg). */
  zoom?: number
}

type Status = 'loading' | 'ok' | 'error'

/** Eingefrorene Lauf-Pose (ein Bein vor, eins zurück; Arme gegengleich). */
const POSE = {
  leftLeg: 0.5,
  rightLeg: -0.5,
  leftArm: -0.5,
  rightArm: 0.5,
  armZ: Math.PI * 0.02
}

/**
 * 3D-Skin-Render via skinview3d (Look angelehnt an den noriskclient-Launcher):
 * Der Spieler steht in einer eingefrorenen Lauf-Pose, von vorne leicht nach
 * rechts eingedreht – keine laufende Animation, kein Auto-Rotieren. Man kann ihn
 * mit der Maus drehen; beim Loslassen federt er in die Grundpose zurück.
 * Der Skin kommt über den Main-Prozess als data:-URL (Mojang-Fetch -> Render);
 * skinview3d wird dynamisch geladen, damit es das Basis-Bundle nicht aufbläht.
 */
export default function SkinRender({
  uuid,
  reloadToken = 0,
  height = 320,
  baseRotation = -0.4,
  zoom = 0.9
}: SkinRenderProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    let viewer: { dispose: () => void } | null = null
    let cleanupDrag: (() => void) | null = null
    let raf = 0
    const width = Math.round(height * 0.62)

    const run = async (): Promise<void> => {
      setStatus('loading')
      const data = await window.api.invoke('skin:get', uuid).catch(() => null)
      if (cancelled || !canvasRef.current) return
      if (!data) {
        setStatus('error')
        return
      }
      try {
        const sv = await import('skinview3d')
        const v = new sv.SkinViewer({
          canvas: canvasRef.current,
          width,
          height,
          zoom,
          fov: 38
        })
        await v.loadSkin(data.dataUrl, { model: data.slim ? 'slim' : 'default' })
        // Eigenes Drehen statt OrbitControls (für sauberes Zurückspringen).
        v.controls.enableZoom = false
        v.controls.enablePan = false
        v.controls.enableRotate = false

        // Eingefrorene Lauf-Pose auf die Gliedmaßen anwenden.
        const p = v.playerObject
        p.skin.leftLeg.rotation.x = POSE.leftLeg
        p.skin.rightLeg.rotation.x = POSE.rightLeg
        p.skin.leftArm.rotation.x = POSE.leftArm
        p.skin.rightArm.rotation.x = POSE.rightArm
        p.skin.leftArm.rotation.z = POSE.armZ
        p.skin.rightArm.rotation.z = -POSE.armZ
        p.rotation.y = baseRotation

        if (cancelled) {
          v.dispose()
          return
        }
        viewer = v
        setStatus('ok')

        // --- Drag-to-rotate mit Zurückfedern in die Grundpose ---
        const canvas = canvasRef.current
        let dragging = false
        let lastX = 0

        const onDown = (e: PointerEvent): void => {
          dragging = true
          lastX = e.clientX
          cancelAnimationFrame(raf)
          canvas.setPointerCapture?.(e.pointerId)
        }
        const onMove = (e: PointerEvent): void => {
          if (!dragging) return
          p.rotation.y += (e.clientX - lastX) * 0.01
          lastX = e.clientX
        }
        const spring = (): void => {
          if (cancelled) return
          const diff = baseRotation - p.rotation.y
          if (Math.abs(diff) < 0.004) {
            p.rotation.y = baseRotation
            return
          }
          p.rotation.y += diff * 0.18
          raf = requestAnimationFrame(spring)
        }
        const onUp = (): void => {
          if (!dragging) return
          dragging = false
          raf = requestAnimationFrame(spring)
        }

        canvas.addEventListener('pointerdown', onDown)
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        cleanupDrag = (): void => {
          canvas.removeEventListener('pointerdown', onDown)
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    run()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      cleanupDrag?.()
      viewer?.dispose()
    }
  }, [uuid, reloadToken, height, baseRotation, zoom])

  return (
    <div className="skin-render" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="skin-render__canvas"
        style={{ display: status === 'ok' ? 'block' : 'none' }}
      />
      {status === 'loading' && (
        <div className="skin-render__msg">
          <Spinner size={26} />
        </div>
      )}
      {status === 'error' && (
        <div className="skin-render__msg muted">Skin nicht verfügbar</div>
      )}
    </div>
  )
}

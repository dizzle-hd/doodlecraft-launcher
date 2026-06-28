import { useEffect, useRef, useState } from 'react'
import { Spinner } from './ui'

export interface SkinRenderProps {
  uuid: string
  /** Erhöhen, um den Skin neu zu laden (Sync-Button). */
  reloadToken?: number
  height?: number
  /** Grunddrehung um die Y-Achse in Radiant (positiv = nach rechts). */
  rotation?: number
  /** Dezente Idle-Animation (Arme/Umhang). */
  idle?: boolean
}

type Status = 'loading' | 'ok' | 'error'

/**
 * 3D-Skin-Render via skinview3d. Holt den Skin über den Main-Prozess als
 * data:-URL (Mojang-Fetch -> Render) und zeigt ihn leicht nach rechts gedreht.
 * skinview3d wird dynamisch geladen, damit es das Basis-Bundle nicht aufbläht.
 */
export default function SkinRender({
  uuid,
  reloadToken = 0,
  height = 320,
  rotation = 0.5,
  idle = true
}: SkinRenderProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    let viewer: { dispose: () => void } | null = null
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
          zoom: 0.82,
          fov: 38
        })
        await v.loadSkin(data.dataUrl, { model: data.slim ? 'slim' : 'default' })
        v.controls.enableZoom = false
        v.controls.enablePan = false
        // WICHTIG: Animation zuerst setzen – ihr Setter resettet die Pose/Rotation.
        // Walking-Animation: ein Bein vorn, eins hinten (laufende Pose).
        if (idle) {
          const walk = new sv.WalkingAnimation()
          walk.headBobbing = false
          v.animation = walk
        }
        // Danach die feste Grunddrehung (nach rechts) anwenden.
        v.playerObject.rotation.y = rotation
        if (cancelled) {
          v.dispose()
          return
        }
        viewer = v
        setStatus('ok')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    run()

    return () => {
      cancelled = true
      viewer?.dispose()
    }
  }, [uuid, reloadToken, height, rotation, idle])

  return (
    <div className="skin-render" style={{ height }}>
      <canvas ref={canvasRef} style={{ display: status === 'ok' ? 'block' : 'none' }} />
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

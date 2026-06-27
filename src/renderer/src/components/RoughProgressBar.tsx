import { useEffect, useRef } from 'react'
import rough from 'roughjs'

export interface RoughProgressBarProps {
  /** Fortschritt 0..1. `undefined` => unbestimmt (animiert). */
  value?: number
  height?: number
  label?: string
  color?: string
}

/**
 * Handgezeichnete Fortschrittsleiste auf Basis von RoughJS.
 * Zeichnet eine skizzenhafte Spur + eine gefüllte, schraffierte Leiste.
 * Bei `value === undefined` läuft ein unbestimmter „Schwung" hin und her.
 */
export default function RoughProgressBar({
  value,
  height = 26,
  label,
  color = 'var(--accent)'
}: RoughProgressBarProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const indeterminatePos = useRef(0)

  useEffect(() => {
    const svg = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return

    const accent = getComputedColor(wrap, color)
    let frame = 0

    const draw = (): void => {
      const w = wrap.clientWidth
      if (w <= 0) return
      const h = height
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      while (svg.firstChild) svg.removeChild(svg.firstChild)

      const rc = rough.svg(svg)
      const pad = 3
      // Spur
      svg.appendChild(
        rc.rectangle(pad, pad, w - pad * 2, h - pad * 2, {
          stroke: 'var(--ink)',
          roughness: 1.6,
          strokeWidth: 1.6
        })
      )

      let fillX = pad
      let fillW: number
      if (value === undefined) {
        // unbestimmt: ein wandernder Block
        const span = (w - pad * 2) * 0.3
        const travel = w - pad * 2 - span
        const x = pad + (Math.sin(indeterminatePos.current) * 0.5 + 0.5) * travel
        fillX = x
        fillW = span
      } else {
        const clamped = Math.max(0, Math.min(1, value))
        fillW = (w - pad * 2) * clamped
      }

      if (fillW > 2) {
        svg.appendChild(
          rc.rectangle(fillX, pad, fillW, h - pad * 2, {
            stroke: accent,
            fill: accent,
            fillStyle: 'hachure',
            hachureGap: 4,
            roughness: 1.8,
            strokeWidth: 1.4
          })
        )
      }
    }

    const loop = (): void => {
      indeterminatePos.current += 0.05
      draw()
      frame = requestAnimationFrame(loop)
    }

    if (value === undefined) {
      frame = requestAnimationFrame(loop)
    } else {
      draw()
    }

    const ro = new ResizeObserver(() => draw())
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [value, height, color])

  return (
    <div className="rough-progress" ref={wrapRef}>
      <svg ref={svgRef} role="progressbar" />
      {label && <span className="rough-progress__label">{label}</span>}
    </div>
  )
}

/** Löst eine CSS-Variable/Farbe in einen konkreten Farbwert auf. */
function getComputedColor(el: HTMLElement, color: string): string {
  if (!color.startsWith('var(')) return color
  const name = color.slice(4, -1).trim()
  const resolved = getComputedStyle(el).getPropertyValue(name).trim()
  return resolved || '#4f8f3f'
}

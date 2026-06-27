import type { CSSProperties, ReactNode } from 'react'

export interface DoodleCardProps {
  title?: string
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Leichtgewichtiges Papier-Panel im Drawing-Style (ohne wired-card, damit es
 * auch große Inhaltsflächen performant trägt). Der Rand bekommt über `.wobble`
 * den handgezeichneten Look.
 */
export default function DoodleCard({
  title,
  children,
  className,
  style
}: DoodleCardProps): JSX.Element {
  return (
    <section className={`doodle-card ${className ?? ''}`} style={style}>
      <div className="doodle-card__border wobble" aria-hidden="true" />
      {title && <h3 className="doodle-card__title">{title}</h3>}
      <div className="doodle-card__body">{children}</div>
    </section>
  )
}

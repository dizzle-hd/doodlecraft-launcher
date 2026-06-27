import { useState } from 'react'

export interface SkinHeadProps {
  uuid: string
  name: string
  size?: number
}

/**
 * Zeigt den Skin-Kopf eines Accounts. Quelle ist mc-heads.net (per https,
 * von der CSP erlaubt). Schlägt das Laden fehl, wird ein Initial-Block gezeigt.
 */
export default function SkinHead({
  uuid,
  name,
  size = 40
}: SkinHeadProps): JSX.Element {
  const [failed, setFailed] = useState(false)
  const px = { width: size, height: size }

  if (failed) {
    return (
      <div className="skin-head skin-head--fallback" style={px}>
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      className="skin-head"
      style={px}
      width={size}
      height={size}
      alt={name}
      src={`https://mc-heads.net/avatar/${uuid}/${size}`}
      onError={() => setFailed(true)}
    />
  )
}

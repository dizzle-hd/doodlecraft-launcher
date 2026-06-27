import type { CSSProperties } from 'react'

/* Schlanke, einheitliche Linien-Icons (24×24, currentColor). */
const PATHS: Record<string, JSX.Element> = {
  play: <path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor" stroke="none" />,
  instances: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  mods: (
    <path d="M9 4h2.2a1.8 1.8 0 113.6 0H17a1 1 0 011 1v2.2a1.8 1.8 0 100 3.6V13a1 1 0 01-1 1h-2.2a1.8 1.8 0 11-3.6 0H9a1 1 0 01-1-1v-2.2a1.8 1.8 0 110-3.6V5a1 1 0 011-1z" />
  ),
  logs: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M7 9h10M7 12.5h10M7 16h6" />
    </>
  ),
  accounts: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </>
  ),
  design: (
    <>
      <path d="M12 3a9 9 0 100 18c1.3 0 2-1 2-2 0-1.3-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H17a4 4 0 004-4c0-4.4-4-8-9-8z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  folder: (
    <path d="M3.5 6.5a2 2 0 012-2h3.3a2 2 0 011.4.6l1.1 1.1a2 2 0 001.4.6h5.4a2 2 0 012 2v8.1a2 2 0 01-2 2H5.5a2 2 0 01-2-2z" />
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M5 16a2 2 0 01-1-1.7V6a2 2 0 012-2h7.3A2 2 0 0116 5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
    </>
  ),
  package: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 21v-9" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5L5 19" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  download: <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="1.5" />,
  skin: (
    <>
      <path d="M8 3.5L4 6v4l2 1v6.5h8V11l2-1V6l-4-2.5a4 4 0 01-4 0z" />
    </>
  ),
  refresh: (
    <>
      <path d="M4 11a8 8 0 0114-5l2 2M20 13a8 8 0 01-14 5l-2-2" />
      <path d="M20 4v4h-4M4 20v-4h4" />
    </>
  )
}

export interface IconProps {
  name: keyof typeof PATHS
  size?: number
  className?: string
  style?: CSSProperties
}

export default function Icon({ name, size = 20, className, style }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

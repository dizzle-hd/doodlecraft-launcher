import { useEffect, useState } from 'react'

/**
 * Eigene Titelleiste für das rahmenlose Fenster. Der mittlere Bereich ist als
 * Drag-Region markiert; die Buttons steuern das Fenster über IPC.
 */
export default function TitleBar(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.api.invoke('window:isMaximized').then(setMaximized)
    return window.api.on('window:maximizedChanged', setMaximized)
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__logo">◆</span>
        <span className="titlebar__name">DoodleCraft</span>
      </div>
      <div className="titlebar__drag" />
      <div className="titlebar__controls">
        <button
          className="winbtn"
          title="Minimieren"
          onClick={() => window.api.invoke('window:minimize')}
        >
          <svg width="11" height="11" viewBox="0 0 11 11">
            <rect x="1" y="5" width="9" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="winbtn"
          title={maximized ? 'Wiederherstellen' : 'Maximieren'}
          onClick={() =>
            window.api.invoke('window:toggleMaximize').then(setMaximized)
          }
        >
          {maximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11">
              <rect x="2.5" y="0.5" width="8" height="8" fill="none" stroke="currentColor" />
              <rect x="0.5" y="2.5" width="8" height="8" fill="var(--bg)" stroke="currentColor" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11">
              <rect x="1" y="1" width="9" height="9" fill="none" stroke="currentColor" />
            </svg>
          )}
        </button>
        <button
          className="winbtn winbtn--close"
          title="Schließen"
          onClick={() => window.api.invoke('window:close')}
        >
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>
      </div>
    </div>
  )
}

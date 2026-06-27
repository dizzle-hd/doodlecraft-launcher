import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/**
 * JSX-Typen für die wired-elements Web-Components, damit sie typsicher in
 * TSX verwendet werden können. Wir deklarieren nur die tatsächlich genutzten
 * Attribute; alles andere wird über die generischen HTML-Attribute abgedeckt.
 */
type WiredElement<T = Record<string, unknown>> = DetailedHTMLProps<
  HTMLAttributes<HTMLElement> & T,
  HTMLElement
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wired-button': WiredElement<{ elevation?: number; disabled?: boolean }>
      'wired-card': WiredElement<{ elevation?: number }>
      'wired-input': WiredElement<{
        placeholder?: string
        value?: string
        type?: string
        disabled?: boolean
      }>
      'wired-combo': WiredElement<{ selected?: string; value?: string }>
      'wired-item': WiredElement<{ value?: string }>
      'wired-checkbox': WiredElement<{ checked?: boolean; disabled?: boolean }>
      'wired-slider': WiredElement<{
        value?: number
        min?: number
        max?: number
      }>
      'wired-progress': WiredElement<{
        value?: number
        min?: number
        max?: number
        percentage?: boolean
      }>
      'wired-spinner': WiredElement<{ spinning?: boolean; duration?: number }>
      'wired-divider': WiredElement
      'wired-tab': WiredElement<{ name?: string; label?: string }>
      'wired-tabs': WiredElement<{ selected?: string }>
      'wired-dialog': WiredElement<{ open?: boolean }>
      'wired-fab': WiredElement
      'wired-icon-button': WiredElement
      'wired-toggle': WiredElement<{ checked?: boolean; disabled?: boolean }>
    }
  }
}

export {}

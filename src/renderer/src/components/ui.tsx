import {
  useEffect,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'

/* Moderne, CSS-getriebene UI-Bausteine (ersetzt wired-elements). */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps {
  children?: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  small?: boolean
  full?: boolean
  title?: string
  type?: 'button' | 'submit'
  className?: string
  style?: CSSProperties
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  small,
  full,
  title,
  type = 'button',
  className,
  style
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`btn btn--${variant} ${small ? 'btn--sm' : ''} ${
        full ? 'btn--full' : ''
      } ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

export interface IconButtonProps {
  children: ReactNode
  onClick?: () => void
  title?: string
  danger?: boolean
  className?: string
}

export function IconButton({
  children,
  onClick,
  title,
  danger,
  className
}: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`icon-btn ${danger ? 'icon-btn--danger' : ''} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

export interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  onEnter?: () => void
  full?: boolean
  className?: string
  style?: CSSProperties
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  onEnter,
  full,
  className,
  style
}: InputProps): JSX.Element {
  return (
    <input
      className={`field ${full ? 'field--full' : ''} ${className ?? ''}`}
      style={style}
      value={value}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) onEnter()
      }}
    />
  )
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  className?: string
  style?: CSSProperties
}

export function Select({
  value,
  onChange,
  options,
  disabled,
  className,
  style
}: SelectProps): JSX.Element {
  return (
    <div className={`select ${className ?? ''}`} style={style}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="select__chevron" aria-hidden="true">
        ▾
      </span>
    </div>
  )
}

export interface CardProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Card({ children, className, style, onClick }: CardProps): JSX.Element {
  return (
    <div
      className={`card ${onClick ? 'card--clickable' : ''} ${className ?? ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export interface ChipProps {
  children: ReactNode
  tone?: 'default' | 'accent' | 'danger'
}

export function Chip({ children, tone = 'default' }: ChipProps): JSX.Element {
  return <span className={`chip chip--${tone}`}>{children}</span>
}

export interface ProgressBarProps {
  /** 0..1, oder undefined für unbestimmt. */
  value?: number
  tone?: 'accent' | 'danger'
}

export function ProgressBar({ value, tone = 'accent' }: ProgressBarProps): JSX.Element {
  const indeterminate = value === undefined
  const pct = Math.max(0, Math.min(1, value ?? 0)) * 100
  return (
    <div className="progress">
      <div
        className={`progress__fill progress__fill--${tone} ${
          indeterminate ? 'progress__fill--indeterminate' : ''
        }`}
        style={indeterminate ? undefined : { width: `${pct}%` }}
      />
    </div>
  )
}

export function Spinner({ size = 18 }: { size?: number }): JSX.Element {
  return <span className="spinner" style={{ width: size, height: size }} />
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: ReactNode
  footer?: ReactNode
  width?: number
  /** Nutzt die volle verfügbare Höhe (für inhaltsreiche Fenster). */
  fullHeight?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 540,
  fullHeight
}: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  // In einen Portal an <body> rendern, damit das `position: fixed`-Overlay
  // sich am Fenster ausrichtet und nicht an einem transformierten Vorfahren
  // (z. B. der Seiten-Animation) hängen bleibt – sonst wird der Dialog
  // gestaucht/abgeschnitten.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${fullHeight ? 'modal--full' : ''}`}
        style={{ width: `min(${width}px, 92vw)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2>{title}</h2>
          <IconButton title="Schließen" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

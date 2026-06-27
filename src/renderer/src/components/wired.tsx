import {
  forwardRef,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode
} from 'react'
// Seiteneffekt-Import: registriert alle <wired-*> Custom Elements.
import 'wired-elements'

/** Mergt mehrere Refs auf dasselbe Element. */
function useMergedRef<T>(external: React.ForwardedRef<T>) {
  const local = useRef<T | null>(null)
  const set = (node: T | null): void => {
    local.current = node
    if (typeof external === 'function') external(node)
    else if (external) external.current = node
  }
  return [local, set] as const
}

export interface WiredButtonProps {
  children?: ReactNode
  onClick?: () => void
  elevation?: number
  disabled?: boolean
  className?: string
  style?: CSSProperties
}

export function WiredButton({
  children,
  onClick,
  elevation,
  disabled,
  className,
  style
}: WiredButtonProps): JSX.Element {
  return (
    <wired-button
      elevation={elevation}
      disabled={disabled}
      className={className}
      style={style}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </wired-button>
  )
}

export interface WiredCardProps {
  children?: ReactNode
  elevation?: number
  className?: string
  style?: CSSProperties
}

export function WiredCard({
  children,
  elevation = 2,
  className,
  style
}: WiredCardProps): JSX.Element {
  return (
    <wired-card elevation={elevation} className={className} style={style}>
      {children}
    </wired-card>
  )
}

export interface WiredInputProps {
  value?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  onValueChange?: (value: string) => void
  className?: string
  style?: CSSProperties
}

/** wired-input arbeitet über DOM-Properties/Events -> via Ref synchronisieren. */
export const WiredInput = forwardRef<HTMLElement, WiredInputProps>(
  function WiredInput(
    { value, placeholder, type, disabled, onValueChange, className, style },
    forwarded
  ) {
    const [ref, setRef] = useMergedRef<HTMLElement>(forwarded)

    useEffect(() => {
      const el = ref.current as (HTMLElement & { value?: string }) | null
      if (el && value !== undefined && el.value !== value) el.value = value
    }, [value, ref])

    useEffect(() => {
      const el = ref.current
      if (!el || !onValueChange) return
      const handler = (e: Event): void => {
        const target = e.target as HTMLElement & { value?: string }
        onValueChange(target.value ?? '')
      }
      el.addEventListener('input', handler)
      el.addEventListener('change', handler)
      return () => {
        el.removeEventListener('input', handler)
        el.removeEventListener('change', handler)
      }
    }, [onValueChange, ref])

    return (
      <wired-input
        ref={setRef as never}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        className={className}
        style={style}
      />
    )
  }
)

export interface WiredComboProps {
  value?: string
  onSelect?: (value: string) => void
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/** wired-combo feuert ein 'selected'-Event mit detail.selected. */
export function WiredCombo({
  value,
  onSelect,
  children,
  className,
  style
}: WiredComboProps): JSX.Element {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !onSelect) return
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ selected?: string }>).detail
      if (detail?.selected !== undefined) onSelect(detail.selected)
    }
    el.addEventListener('selected', handler)
    return () => el.removeEventListener('selected', handler)
  }, [onSelect])

  return (
    <wired-combo
      ref={ref as never}
      selected={value}
      className={className}
      style={style}
    >
      {children}
    </wired-combo>
  )
}

export interface WiredItemProps {
  value: string
  children?: ReactNode
}

export function WiredItem({ value, children }: WiredItemProps): JSX.Element {
  return <wired-item value={value}>{children}</wired-item>
}

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  label: string
  icon: ReactNode
  onClick?: () => void
  to?: string
  disabled?: boolean
  tone?: 'default' | 'danger'
}

/** Tombol ikon dengan tooltip nama fungsi (hover + fokus keyboard). */
export default function IconButton({
  label,
  icon,
  onClick,
  to,
  disabled = false,
  tone = 'default',
}: Props) {
  const classes = `group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${
    tone === 'danger'
      ? 'text-red-600 hover:bg-red-50'
      : 'text-ink hover:bg-page'
  } ${disabled ? 'pointer-events-none opacity-40' : ''}`

  const tooltip = (
    <span
      role="tooltip"
      className="bg-ink pointer-events-none absolute top-1/2 right-full z-20 mr-2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  )

  const content = (
    <>
      {icon}
      {tooltip}
    </>
  )

  if (to && !disabled) {
    return (
      <Link to={to} aria-label={label} title={label} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={classes}
    >
      {content}
    </button>
  )
}

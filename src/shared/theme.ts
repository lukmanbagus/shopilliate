export interface ThemeColors {
  primary: string
  hover: string
  soft: string
  ink: string
  text: string
  onPrimary: string
}

export const DEFAULT_THEME_COLOR = '#F2542D'

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim()
  const short = /^#?([0-9a-f]{3})$/i.exec(trimmed)
  if (short) {
    const [r, g, b] = short[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  const long = /^#?([0-9a-f]{6})$/i.exec(trimmed)
  if (long) return `#${long[1].toUpperCase()}`
  return null
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex) ?? DEFAULT_THEME_COLOR
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ]
}

function toHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0')
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function channelLuminance(channel: number): number {
  const value = channel / 255
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  )
}

export function contrastRatio(a: string, b: string): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b))
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b))
  return (lighter + 0.05) / (darker + 0.05)
}

/** Mixes `color` with `target`; weight is the amount of `target` (0–1). */
export function mixColors(
  color: string,
  target: string,
  weight: number,
): string {
  const [r1, g1, b1] = hexToRgb(color)
  const [r2, g2, b2] = hexToRgb(target)
  const amount = Math.max(0, Math.min(1, weight))
  return rgbToHex(
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  )
}

function ensureContrast(
  color: string,
  background: string,
  target: number,
): string {
  let current = color
  for (let step = 0; step < 30; step++) {
    if (contrastRatio(current, background) >= target) return current
    current = mixColors(current, '#000000', 0.1)
  }
  return current
}

export function generateTheme(input: string): ThemeColors {
  const primary = normalizeHexColor(input) ?? DEFAULT_THEME_COLOR
  const soft = mixColors(primary, '#FFFFFF', 0.88)
  const onPrimary =
    contrastRatio('#FFFFFF', primary) >= 3 ? '#FFFFFF' : '#111111'

  return {
    primary,
    hover: mixColors(primary, '#000000', 0.14),
    soft,
    ink: ensureContrast(primary, soft, 4.5),
    text: ensureContrast(primary, '#FFFFFF', 4.5),
    onPrimary,
  }
}

interface ThemeDocument {
  documentElement: {
    style: { setProperty(name: string, value: string): void }
  }
  querySelector(selector: string): {
    setAttribute(name: string, value: string): void
  } | null
}

export function applyTheme(colors: ThemeColors): void {
  const doc = (
    globalThis as unknown as { document?: ThemeDocument }
  ).document
  if (!doc) return
  const root = doc.documentElement
  const values: Record<string, string> = {
    '--color-primary': colors.primary,
    '--color-primary-hover': colors.hover,
    '--color-primary-soft': colors.soft,
    '--color-primary-ink': colors.ink,
    '--color-primary-text': colors.text,
    '--color-on-primary': colors.onPrimary,
  }
  for (const [key, value] of Object.entries(values)) {
    root.style.setProperty(key, value)
  }
  doc
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', colors.primary)
}

export function applyThemeColor(color: string): void {
  applyTheme(generateTheme(color))
}

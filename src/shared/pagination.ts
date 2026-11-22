export const DEFAULT_PRODUCTS_PER_PAGE = 24
export const MIN_PRODUCTS_PER_PAGE = 4
export const MAX_PRODUCTS_PER_PAGE = 48

export function normalizeProductsPerPage(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN
  if (!Number.isFinite(parsed)) return DEFAULT_PRODUCTS_PER_PAGE
  const rounded = Math.trunc(parsed)
  if (rounded < MIN_PRODUCTS_PER_PAGE) return MIN_PRODUCTS_PER_PAGE
  if (rounded > MAX_PRODUCTS_PER_PAGE) return MAX_PRODUCTS_PER_PAGE
  return rounded
}

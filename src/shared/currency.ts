export const CURRENCIES = [
  { code: 'IDR', label: 'Indonesian Rupiah (IDR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'MYR', label: 'Malaysian Ringgit (MYR)' },
  { code: 'PHP', label: 'Philippine Peso (PHP)' },
  { code: 'THB', label: 'Thai Baht (THB)' },
  { code: 'VND', label: 'Vietnamese Dong (VND)' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const CURRENCY_CODES: CurrencyCode[] = CURRENCIES.map(
  (currency) => currency.code,
)

export const DEFAULT_CURRENCY: CurrencyCode = 'IDR'

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return CURRENCY_CODES.includes(value.toUpperCase() as CurrencyCode)
}

export function normalizeCurrency(value: unknown): CurrencyCode {
  if (typeof value !== 'string') return DEFAULT_CURRENCY
  const code = value.trim().toUpperCase()
  return isSupportedCurrency(code) ? code : DEFAULT_CURRENCY
}

/** Formats a stored number as-is, without converting its value. */
export function formatMoney(
  amount: number,
  currency: CurrencyCode | string,
): string {
  const code = normalizeCurrency(currency)
  const digits = code === 'IDR' || code === 'VND' ? 0 : 2

  return new Intl.NumberFormat(code === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(amount) ? amount : 0)
}

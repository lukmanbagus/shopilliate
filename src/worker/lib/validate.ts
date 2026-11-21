export const SHOPEE_HOSTS = new Set([
  'shopee.co.id',
  's.shopee.co.id',
  'shp.ee',
  'id.shp.ee',
])

const HOST_ALIASES = new Map([['www.shopee.co.id', 'shopee.co.id']])

export function isAllowedShopeeHost(hostname: string): boolean {
  const host = HOST_ALIASES.get(hostname.toLowerCase()) ?? hostname.toLowerCase()
  return SHOPEE_HOSTS.has(host)
}

export function canonicalShopeeUrl(input: string): URL | null {
  let candidate = input.trim()
  if (!candidate) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (url.port && url.port !== '443') return null

  const host = url.hostname.toLowerCase()
  const canonical = HOST_ALIASES.get(host) ?? host
  if (!SHOPEE_HOSTS.has(canonical)) return null

  url.hostname = canonical
  url.port = ''
  url.hash = ''
  return url
}

export function isAllowedShopeeUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === '443') &&
    isAllowedShopeeHost(url.hostname)
  )
}

/** Hanya CDN Shopee yang boleh diunduh gambarnya (mencegah SSRF). */
export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'shopee.co.id' ||
    host.endsWith('.shopee.co.id') ||
    host.endsWith('.susercontent.com')
  )
}

export function isAllowedImageUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === '443') &&
    isAllowedImageHost(url.hostname)
  )
}

export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const withoutCurrency = trimmed.replace(/^Rp\s*/i, '')
  const millions = /^\d{1,3}(\.\d{3})+$/.test(withoutCurrency)
  const normalized = millions
    ? withoutCurrency.replace(/\./g, '')
    : withoutCurrency

  const direct = Number(normalized)
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct)

  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return null
  return Number(digits)
}

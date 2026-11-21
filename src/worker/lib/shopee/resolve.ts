import { canonicalShopeeUrl, isAllowedShopeeUrl } from '../validate'
import { safeFetch } from '../safeFetch'

export class ShopeeError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 422) {
    super(message)
    this.name = 'ShopeeError'
    this.code = code
    this.status = status
  }
}

export interface ResolvedShopeeLink {
  originalUrl: string
  productUrl: string
  shopId: string
  itemId: string
}

const PRODUCT_PATH = /^\/product\/(\d{1,20})\/(\d{1,20})(?:\/|$)/
const ITEM_SLUG = /-i\.(\d{1,20})\.(\d{1,20})(?:\/|$)/

export function extractShopeeIds(
  url: URL,
): { shopId: string; itemId: string } | null {
  const path = url.pathname
  const byPath = path.match(PRODUCT_PATH)
  if (byPath) return { shopId: byPath[1], itemId: byPath[2] }
  const bySlug = path.match(ITEM_SLUG)
  if (bySlug) return { shopId: bySlug[1], itemId: bySlug[2] }
  return null
}

export async function resolveShopeeProductUrl(
  input: string,
): Promise<ResolvedShopeeLink> {
  const original = canonicalShopeeUrl(input)
  if (!original) {
    throw new ShopeeError(
      'INVALID_DOMAIN',
      'Link tidak valid. Gunakan link produk Shopee Indonesia (shopee.co.id, s.shopee.co.id, shp.ee, atau id.shp.ee).',
      400,
    )
  }

  const direct = extractShopeeIds(original)
  if (direct) {
    return {
      originalUrl: input,
      productUrl: `https://shopee.co.id/product/${direct.shopId}/${direct.itemId}`,
      ...direct,
    }
  }

  let current = original
  for (let hop = 0; hop <= 5; hop++) {
    const response = await safeFetch(current, {
      validateUrl: isAllowedShopeeUrl,
      maxRedirects: 0,
      timeoutMs: 8000,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    })

    const finalUrl = new URL(response.url || current.toString())
    const ids = extractShopeeIds(finalUrl)
    if (ids) {
      return {
        originalUrl: input,
        productUrl: `https://shopee.co.id/product/${ids.shopId}/${ids.itemId}`,
        ...ids,
      }
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location')
      if (!location) break
      let next: URL
      try {
        next = new URL(location, current)
      } catch {
        break
      }
      if (!isAllowedShopeeUrl(next)) {
        throw new ShopeeError(
          'INVALID_DOMAIN',
          'Link pendek mengarah ke domain yang tidak diizinkan.',
          400,
        )
      }
      current = next
      continue
    }
    break
  }

  throw new ShopeeError(
    'UNRESOLVED_LINK',
    'Link Shopee tidak dapat dikenali sebagai halaman produk. Pastikan link mengarah ke produk, bukan toko atau halaman lain.',
    422,
  )
}

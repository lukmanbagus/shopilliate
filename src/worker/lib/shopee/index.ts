import {
  resolveShopeeProductUrl,
  ShopeeError,
  type ResolvedShopeeLink,
} from './resolve'
import { fetchViaAffiliateApi } from './affiliateApi'
import { fetchViaHtml } from './htmlScrape'

export interface ShopeeProductData {
  title: string
  price: number
  imageUrl: string | null
  soldText: string | null
  affiliateUrl: string | null
  shopId: string
  itemId: string
  source: 'affiliate_api' | 'html'
}

export interface LookupResult {
  data: ShopeeProductData
  resolved: ResolvedShopeeLink
}

/**
 * Adapter berlapis: Affiliate API resmi lebih dulu, lalu pengambilan HTML.
 * Adapter C (isi manual) ditangani di antarmuka admin.
 */
export async function lookupShopeeProduct(
  db: D1Database,
  rawUrl: string,
): Promise<LookupResult> {
  const resolved = await resolveShopeeProductUrl(rawUrl)

  try {
    const affiliate = await fetchViaAffiliateApi(db, resolved)
    if (affiliate) {
      return {
        resolved,
        data: {
          ...affiliate,
          shopId: resolved.shopId,
          itemId: resolved.itemId,
          source: 'affiliate_api',
        },
      }
    }
  } catch (error) {
    console.warn('Adapter Affiliate API gagal:', (error as Error).message)
  }

  try {
    const scraped = await fetchViaHtml(resolved.productUrl)
    if (scraped) {
      return {
        resolved,
        data: {
          ...scraped,
          affiliateUrl: null,
          shopId: resolved.shopId,
          itemId: resolved.itemId,
          source: 'html',
        },
      }
    }
  } catch (error) {
    console.warn('Adapter HTML gagal:', (error as Error).message)
  }

  throw new ShopeeError(
    'FETCH_FAILED',
    'Data produk tidak dapat diambil otomatis dari Shopee. Silakan isi nama, harga, dan gambar secara manual.',
    422,
  )
}

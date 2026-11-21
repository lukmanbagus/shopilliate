import { getSetting } from '../schema'
import { parsePrice } from '../validate'
import type { ResolvedShopeeLink } from './resolve'

const ENDPOINT = 'https://open-api.affiliate.shopee.co.id/graphql'
const TIMEOUT_MS = 8000

interface AffiliateOffer {
  productName?: string
  imageUrl?: string
  priceMin?: string
  priceMax?: string
  offerLink?: string
  sales?: number
}

export interface AffiliateProduct {
  title: string
  price: number
  imageUrl: string | null
  soldText: string | null
  affiliateUrl: string | null
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function signedHeaders(
  appId: string,
  secret: string,
  payload: string,
): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = await sha256Hex(`${appId}${timestamp}${payload}${secret}`)
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
  }
}

function formatSold(sales: number | undefined): string | null {
  if (!sales || sales <= 0) return null
  if (sales >= 1000) {
    const thousands = sales / 1000
    const label =
      thousands >= 10
        ? String(Math.floor(thousands))
        : thousands.toFixed(1).replace('.0', '').replace('.', ',')
    return `${label}RB+ terjual`
  }
  return `${sales} terjual`
}

async function graphql<T>(
  appId: string,
  secret: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const payload = JSON.stringify({ query, variables: variables ?? {} })
  const headers = await signedHeaders(appId, secret, payload)
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: payload,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Shopee Affiliate API HTTP ${response.status}`)
  }
  const body = (await response.json()) as {
    data?: T
    errors?: Array<{ message?: string }>
  }
  if (body.errors?.length) {
    throw new Error(
      `Shopee Affiliate API: ${body.errors[0]?.message ?? 'kesalahan GraphQL'}`,
    )
  }
  if (!body.data) throw new Error('Respons Shopee Affiliate API kosong')
  return body.data
}

/**
 * Adapter A: Shopee Affiliate Open API.
 * Memerlukan App ID dan Secret yang diisi admin di Pengaturan.
 */
export async function fetchViaAffiliateApi(
  db: D1Database,
  link: ResolvedShopeeLink,
): Promise<AffiliateProduct | null> {
  const appId = await getSetting(db, 'shopee_app_id')
  const secret = await getSetting(db, 'shopee_app_secret')
  if (!appId || !secret) return null

  const shopId = Number(link.shopId)
  const itemId = Number(link.itemId)
  if (!Number.isSafeInteger(shopId) || !Number.isSafeInteger(itemId)) {
    return null
  }

  const data = await graphql<{
    productOfferV2?: { nodes?: AffiliateOffer[] }
  }>(
    appId,
    secret,
    `query {
      productOfferV2(shopId: ${shopId}, itemId: ${itemId}, limit: 1) {
        nodes { productName imageUrl priceMin priceMax offerLink sales }
      }
    }`,
  )

  const offer = data.productOfferV2?.nodes?.find((node) => node.productName)
  if (!offer?.productName) return null

  const price = parsePrice(offer.priceMin) ?? parsePrice(offer.priceMax)
  if (price === null) return null

  let affiliateUrl = offer.offerLink ?? null
  if (!affiliateUrl) {
    affiliateUrl = await generateShortLink(appId, secret, link.originalUrl)
  }

  return {
    title: offer.productName,
    price,
    imageUrl: offer.imageUrl ?? null,
    soldText: formatSold(offer.sales),
    affiliateUrl,
  }
}

async function generateShortLink(
  appId: string,
  secret: string,
  originUrl: string,
): Promise<string | null> {
  try {
    const data = await graphql<{ generateShortLink?: { shortLink?: string } }>(
      appId,
      secret,
      `mutation ($input: GenerateShortLinkInput!) {
        generateShortLink(input: $input) { shortLink }
      }`,
      { input: { originUrl } },
    )
    return data.generateShortLink?.shortLink ?? null
  } catch {
    return null
  }
}

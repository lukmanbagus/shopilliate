import { isAllowedShopeeUrl, parsePrice } from '../validate'
import { safeFetch } from '../safeFetch'

const MAX_HTML_BYTES = 2 * 1024 * 1024

export interface ScrapedProduct {
  title: string
  price: number
  imageUrl: string | null
  soldText: string | null
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function metaTags(html: string): Map<string, string> {
  const map = new Map<string, string>()
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const key = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
    if (key && content !== undefined) {
      map.set(key.toLowerCase().trim(), decodeEntities(content))
    }
  }
  return map
}

interface JsonLdProduct {
  name?: string
  image?: string | string[]
  offers?: { price?: string | number } | Array<{ price?: string | number }>
}

function jsonLdProduct(html: string): JsonLdProduct | null {
  const scripts =
    html.match(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) ?? []

  for (const script of scripts) {
    const json = script.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '')
    try {
      const parsed = JSON.parse(json) as unknown
      const candidates = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed !== null && '@graph' in parsed
          ? ((parsed as { '@graph': unknown[] })['@graph'] ?? [])
          : [parsed]
      for (const candidate of candidates) {
        if (
          candidate &&
          typeof candidate === 'object' &&
          (candidate as { '@type'?: string })['@type'] === 'Product'
        ) {
          return candidate as JsonLdProduct
        }
      }
    } catch {
      // Abaikan JSON-LD yang tidak valid.
    }
  }
  return null
}

/**
 * Adapter B: pengambilan halaman publik (Open Graph + JSON-LD).
 * Hanya dipakai saat admin menekan tombol Ambil Data.
 */
export async function fetchViaHtml(
  productUrl: string,
): Promise<ScrapedProduct | null> {
  const response = await safeFetch(productUrl, {
    validateUrl: isAllowedShopeeUrl,
    maxRedirects: 5,
    timeoutMs: 8000,
    headers: { Accept: 'text/html,application/xhtml+xml' },
  })
  if (!response.ok) return null

  const length = Number(response.headers.get('Content-Length') ?? 0)
  if (length > MAX_HTML_BYTES) return null

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_HTML_BYTES) return null
  const html = new TextDecoder().decode(buffer)

  const meta = metaTags(html)
  const ld = jsonLdProduct(html)

  const title = meta.get('og:title') ?? meta.get('twitter:title') ?? ld?.name
  if (!title || !title.trim()) return null

  const price =
    parsePrice(meta.get('product:price:amount')) ??
    parsePrice(meta.get('og:price:amount')) ??
    parsePrice(
      Array.isArray(ld?.offers) ? ld?.offers[0]?.price : ld?.offers?.price,
    )

  let imageUrl = meta.get('og:image') ?? meta.get('twitter:image') ?? null
  if (!imageUrl && ld?.image) {
    imageUrl = Array.isArray(ld.image) ? ld.image[0] : ld.image
  }
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, productUrl).toString()
    } catch {
      imageUrl = null
    }
  }

  if (price === null && !imageUrl) return null

  return {
    title: title.trim().slice(0, 200),
    price: price ?? 0,
    imageUrl,
    soldText: meta.get('product:sold') ?? null,
  }
}

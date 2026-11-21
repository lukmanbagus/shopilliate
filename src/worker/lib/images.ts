export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

import { isAllowedImageUrl } from './validate'
import { safeFetch } from './safeFetch'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function imageExtension(contentType: string): string | null {
  return EXTENSIONS[contentType.split(';')[0].trim().toLowerCase()] ?? null
}

/** Memeriksa signature berkas agar tipe yang diklaim tidak dipalsukan. */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp'
  return null
}

export function validateImage(
  bytes: Uint8Array,
  declaredType: string,
): { contentType: string; extension: string } | { error: string } {
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { error: 'Ukuran gambar maksimal 5 MB.' }
  }
  const sniffed = sniffImageType(bytes)
  const extension = sniffed ? imageExtension(sniffed) : null
  if (!sniffed || !extension) {
    return { error: 'Format gambar harus JPEG, PNG, atau WebP.' }
  }
  if (imageExtension(declaredType) !== extension) {
    return { error: 'Isi berkas tidak sesuai dengan tipe yang dinyatakan.' }
  }
  return { contentType: sniffed, extension }
}

export function randomImageKey(prefix: string, extension: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let suffix = ''
  for (const byte of bytes) suffix += byte.toString(16).padStart(2, '0')
  return `${prefix}/${Date.now().toString(36)}-${suffix}.${extension}`
}

export async function putImage(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  await bucket.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
}

export async function removeImage(
  bucket: R2Bucket,
  key: string | null,
): Promise<void> {
  if (!key) return
  await bucket.delete(key)
}

export interface DetectedImage {
  contentType: string
  extension: string
}

export function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes.byteLength > MAX_IMAGE_BYTES) return null
  const sniffed = sniffImageType(bytes)
  if (!sniffed) return null
  const extension = imageExtension(sniffed)
  return extension ? { contentType: sniffed, extension } : null
}

export interface DownloadedImage {
  buffer: ArrayBuffer
  contentType: string
  extension: string
}

/** Mengunduh gambar hanya dari CDN Shopee dengan batas ukuran dan tipe. */
export async function downloadShopeeImage(
  rawUrl: string,
): Promise<DownloadedImage | null> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (!isAllowedImageUrl(url)) return null

  try {
    const response = await safeFetch(url, {
      validateUrl: isAllowedImageUrl,
      maxRedirects: 3,
      timeoutMs: 8000,
      headers: { Accept: 'image/webp,image/png,image/jpeg' },
    })
    if (!response.ok) return null

    const declared = Number(response.headers.get('Content-Length') ?? 0)
    if (declared > MAX_IMAGE_BYTES) return null

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null

    const detected = detectImage(new Uint8Array(buffer))
    if (!detected) return null
    return { buffer, ...detected }
  } catch {
    return null
  }
}

export async function moveImage(
  bucket: R2Bucket,
  fromKey: string,
  toKey: string,
): Promise<boolean> {
  const object = await bucket.get(fromKey)
  if (!object) return false
  const buffer = await object.arrayBuffer()
  await bucket.put(toKey, buffer, {
    httpMetadata: {
      contentType:
        object.httpMetadata?.contentType ?? 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
  await bucket.delete(fromKey)
  return true
}

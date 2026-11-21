const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308])

export interface SafeFetchOptions {
  validateUrl: (url: URL) => boolean
  maxRedirects?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

/**
 * Mengambil URL dengan validasi ketat pada setiap lompatan redirect.
 * Mencegah SSRF lewat redirect ke host internal.
 */
export async function safeFetch(
  rawUrl: string | URL,
  options: SafeFetchOptions,
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5
  const timeoutMs = options.timeoutMs ?? 8000
  let current = typeof rawUrl === 'string' ? new URL(rawUrl) : rawUrl

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!options.validateUrl(current)) {
      throw new Error('URL tidak diizinkan')
    }

    const response = await fetch(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        ...options.headers,
      },
    })

    if (!REDIRECT_STATUS.has(response.status)) return response
    if (hop === maxRedirects) return response

    const location = response.headers.get('Location')
    if (!location) {
      throw new Error('Redirect tanpa tujuan')
    }

    let next: URL
    try {
      next = new URL(location, current)
    } catch {
      throw new Error('Tujuan redirect tidak valid')
    }
    if (!options.validateUrl(next)) {
      throw new Error('Redirect menuju domain yang tidak diizinkan')
    }
    current = next
  }

  throw new Error('Terlalu banyak redirect')
}

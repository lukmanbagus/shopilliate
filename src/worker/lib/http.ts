import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { languageFromHeader, translate } from '../../shared/i18n'

export interface ApiErrorBody {
  error: { code: string; message: string }
}

export function apiError(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
) {
  const language = languageFromHeader(c.req.header('Accept-Language'))
  return c.json<ApiErrorBody>(
    { error: { code, message: translate(language, message) } },
    status,
  )
}

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return undefined
  }
}

export function clientIp(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'tidak-diketahui'
  )
}

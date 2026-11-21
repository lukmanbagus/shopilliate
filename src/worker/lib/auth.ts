import type { MiddlewareHandler } from 'hono'
import type { Env } from '../types'
import { apiError } from './http'
import { clearSessionCookie, getSessionUser, readSessionCookie } from './session'

export interface AuthVariables {
  userId: number
  username: string
}

export type AppEnv = { Bindings: Env; Variables: AuthVariables }

export function requireAuth(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = await getSessionUser(c.env.DB, readSessionCookie(c))
    if (!user) {
      clearSessionCookie(c)
      return apiError(c, 'UNAUTHORIZED', 'Sesi tidak valid. Silakan masuk kembali.', 401)
    }
    c.set('userId', user.id)
    c.set('username', user.username)
    await next()
  }
}

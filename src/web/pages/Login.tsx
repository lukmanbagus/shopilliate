import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { firstIssueMessage, loginInputSchema } from '../../shared/schemas'
import { useLanguage } from '../lib/language'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsed = loginInputSchema.safeParse({ username, password })
    if (!parsed.success) {
      setError(t(firstIssueMessage(parsed.error)))
      return
    }

    setSubmitting(true)
    try {
      await api.login(parsed.data)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t('Gagal masuk. Silakan coba lagi.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <p className="text-2xl font-extrabold tracking-tight">
          Shopi<span className="text-primary">lliate</span>
        </p>
        <h1 className="mt-3 text-xl font-bold">{t('Masuk ke panel admin')}</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-line rounded-xl border bg-card p-5 shadow-sm"
        noValidate
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <label className="block text-sm font-semibold" htmlFor="username">
          {t('Username')}
        </label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label className="block text-sm font-semibold" htmlFor="password">
          {t('Password')}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="bg-primary min-h-11 w-full rounded-lg px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? t('Memeriksa…') : t('Masuk')}
        </button>
      </form>

      <p className="text-muted mt-4 text-center text-xs">
        {t('Lupa password? Jalankan')}{' '}
        <code>npm run reset-password</code> {t('di server Anda.')}
      </p>
    </main>
  )
}

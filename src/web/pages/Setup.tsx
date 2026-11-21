import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { firstIssueMessage, setupInputSchema } from '../../shared/schemas'
import { useLanguage } from '../lib/language'

interface Props {
  needsToken: boolean
  onInstalled: () => void
}

export default function Setup({ needsToken, onInstalled }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [siteName, setSiteName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsed = setupInputSchema.safeParse({
      siteName,
      username,
      password,
      confirmPassword,
      setupToken: setupToken || undefined,
    })
    if (!parsed.success) {
      setError(t(firstIssueMessage(parsed.error)))
      return
    }

    setSubmitting(true)
    try {
      await api.setup(parsed.data)
      onInstalled()
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t('Gagal menyelesaikan setup. Silakan coba lagi.'),
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
        <h1 className="mt-3 text-xl font-bold">{t('Selamat datang')}</h1>
        <p className="text-muted mt-1 text-sm">
          {t('Buat akun admin untuk mulai mengelola etalase Anda.')}
        </p>
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

        <label className="block text-sm font-semibold" htmlFor="siteName">
          {t('Nama situs')}
        </label>
        <input
          id="siteName"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          autoComplete="organization"
          maxLength={60}
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
          placeholder={t('Contoh: Belanja Pilihan Moms')}
        />

        <label className="block text-sm font-semibold" htmlFor="username">
          {t('Username')}
        </label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          className="border-line focus:border-primary mt-1 mb-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
          placeholder="admin"
        />
        <p className="text-muted mb-4 text-xs">
          {t('3–32 karakter: huruf kecil, angka, titik, atau garis bawah.')}
        </p>

        <label className="block text-sm font-semibold" htmlFor="password">
          {t('Password')}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="border-line focus:border-primary mt-1 mb-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />
        <p className="text-muted mb-4 text-xs">{t('Minimal 10 karakter.')}</p>

        <label className="block text-sm font-semibold" htmlFor="confirmPassword">
          {t('Konfirmasi password')}
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        {needsToken && (
          <>
            <label className="block text-sm font-semibold" htmlFor="setupToken">
              {t('Kode Setup')}
            </label>
            <input
              id="setupToken"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
            />
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-primary mt-2 min-h-11 w-full rounded-lg px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? t('Menyiapkan…') : t('Buat Akun Admin')}
        </button>
      </form>
    </main>
  )
}

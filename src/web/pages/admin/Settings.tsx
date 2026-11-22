import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { useLanguage } from '../../lib/language'
import {
  changePasswordSchema,
  firstIssueMessage,
} from '../../../shared/schemas'
import { LANGUAGES, type Language } from '../../../shared/i18n'
import { useCurrency } from '../../lib/currency'
import {
  CURRENCIES,
  normalizeCurrency,
  type CurrencyCode,
} from '../../../shared/currency'
import {
  applyThemeColor,
  DEFAULT_THEME_COLOR,
  generateTheme,
  normalizeHexColor,
} from '../../../shared/theme'
import {
  DEFAULT_PRODUCTS_PER_PAGE,
  MAX_PRODUCTS_PER_PAGE,
  MIN_PRODUCTS_PER_PAGE,
  normalizeProductsPerPage,
} from '../../../shared/pagination'
import type { AdminSettings } from '../../../shared/types'

export default function Settings() {
  const { t, setLanguage } = useLanguage()
  const { setCurrency } = useCurrency()
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [siteName, setSiteName] = useState('')
  const [bannerText, setBannerText] = useState('')
  const [heroTitle, setHeroTitle] = useState('')
  const [heroDescription, setHeroDescription] = useState('')
  const [affiliateDisclosure, setAffiliateDisclosure] = useState('')
  const [shopeeAppId, setShopeeAppId] = useState('')
  const [shopeeAppSecret, setShopeeAppSecret] = useState('')
  const [clearShopeeCredentials, setClearShopeeCredentials] = useState(false)
  const [formLanguage, setFormLanguage] = useState<Language>('en')
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR)
  const [themeColorText, setThemeColorText] = useState(DEFAULT_THEME_COLOR)
  const [currency, setCurrencyState] = useState<CurrencyCode>('IDR')
  const [productsPerPage, setProductsPerPage] = useState(
    String(DEFAULT_PRODUCTS_PER_PAGE),
  )

  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{
    tone: 'ok' | 'error'
    text: string
  } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<{
    tone: 'ok' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    let active = true
    api
      .settings()
      .then(({ settings: value }) => {
        if (!active) return
        setSettings(value)
        setSiteName(value.siteName)
        setBannerText(value.bannerText)
        setHeroTitle(value.heroTitle)
        setHeroDescription(value.heroDescription)
        setAffiliateDisclosure(value.affiliateDisclosure)
        setShopeeAppId(value.shopeeAppId)
        setFormLanguage(value.language)
        setThemeColor(value.themeColor)
        setThemeColorText(value.themeColor)
        setCurrencyState(normalizeCurrency(value.currency))
        setProductsPerPage(String(normalizeProductsPerPage(value.productsPerPage)))
      })
      .catch((err) => {
        if (active) {
          setNotice({
            tone: 'error',
            text:
              err instanceof ApiError
                ? err.message
                : t('Pengaturan gagal dimuat.'),
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (!siteName.trim()) {
      setNotice({ tone: 'error', text: t('Nama situs wajib diisi.') })
      return
    }

    const normalizedTheme = normalizeHexColor(themeColorText)
    if (!normalizedTheme) {
      setNotice({ tone: 'error', text: t('Warna tidak valid.') })
      return
    }

    const parsedPerPage = Number(productsPerPage)
    if (
      !Number.isInteger(parsedPerPage) ||
      parsedPerPage < MIN_PRODUCTS_PER_PAGE ||
      parsedPerPage > MAX_PRODUCTS_PER_PAGE
    ) {
      setNotice({
        tone: 'error',
        text: t('Jumlah produk per muatan harus antara 4 sampai 48.'),
      })
      return
    }

    setSaving(true)
    try {
      await api.updateSettings({
        siteName: siteName.trim(),
        bannerText: bannerText.trim(),
        heroTitle: heroTitle.trim(),
        heroDescription: heroDescription.trim(),
        affiliateDisclosure: affiliateDisclosure.trim(),
        shopeeAppId: shopeeAppId.trim(),
        language: formLanguage,
        themeColor: normalizedTheme,
        currency,
        productsPerPage: parsedPerPage,
        ...(shopeeAppSecret ? { shopeeAppSecret } : {}),
        ...(clearShopeeCredentials ? { clearShopeeCredentials: true } : {}),
      })
      setShopeeAppSecret('')
      setClearShopeeCredentials(false)
      setLanguage(formLanguage)
      setThemeColor(normalizedTheme)
      setThemeColorText(normalizedTheme)
      applyThemeColor(normalizedTheme)
      setCurrency(currency)
      setNotice({ tone: 'ok', text: t('Pengaturan berhasil disimpan.') })
    } catch (err) {
      setNotice({
        tone: 'error',
        text:
          err instanceof ApiError ? err.message : t('Gagal menyimpan pengaturan.'),
      })
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordNotice(null)

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!parsed.success) {
      setPasswordNotice({
        tone: 'error',
        text: t(firstIssueMessage(parsed.error)),
      })
      return
    }

    setChanging(true)
    try {
      await api.changePassword(parsed.data)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordNotice({ tone: 'ok', text: t('Password berhasil diubah.') })
    } catch (err) {
      setPasswordNotice({
        tone: 'error',
        text:
          err instanceof ApiError ? err.message : t('Gagal mengubah password.'),
      })
    } finally {
      setChanging(false)
    }
  }

  if (!settings && !notice) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="bg-line/40 h-6 w-40 animate-pulse rounded" />
        <div className="bg-line/40 mt-4 h-96 animate-pulse rounded-xl" />
      </div>
    )
  }

  const themePreview = generateTheme(
    normalizeHexColor(themeColorText) ?? themeColor,
  )

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">{t('Pengaturan')}</h1>
      <p className="text-muted mt-1 text-sm">
        {t('Sesuaikan identitas situs dan kredensial Shopee Affiliate.')}
      </p>

      <form
        onSubmit={save}
        className="border-line mt-4 rounded-xl border bg-card p-5"
        noValidate
      >
        {notice && (
          <div
            role="alert"
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              notice.tone === 'ok'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.text}
          </div>
        )}

        <label className="block text-sm font-semibold" htmlFor="language">
          {t('Bahasa')}
        </label>
        <select
          id="language"
          value={formLanguage}
          onChange={(event) => setFormLanguage(event.target.value as Language)}
          className="border-line mt-1 mb-1 min-h-11 w-full rounded-lg border bg-card px-3 text-sm"
        >
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-muted mb-4 text-xs">
          {t('Pilih bahasa antarmuka situs.')}
        </p>

        <label className="block text-sm font-semibold" htmlFor="themeColor">
          {t('Warna tema')}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="themeColor"
            type="color"
            value={themeColor}
            onChange={(event) => {
              setThemeColor(event.target.value.toUpperCase())
              setThemeColorText(event.target.value.toUpperCase())
            }}
            className="border-line h-11 w-14 cursor-pointer rounded-lg border bg-card p-1"
          />
          <input
            value={themeColorText}
            onChange={(event) => {
              setThemeColorText(event.target.value)
              const normalized = normalizeHexColor(event.target.value)
              if (normalized) setThemeColor(normalized)
            }}
            aria-label={t('Kode warna')}
            placeholder={DEFAULT_THEME_COLOR}
            className="border-line focus:border-primary min-h-11 min-w-0 flex-1 rounded-lg border px-3 font-mono text-sm uppercase outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setThemeColor(DEFAULT_THEME_COLOR)
              setThemeColorText(DEFAULT_THEME_COLOR)
            }}
            title={t('Kembalikan ke warna default')}
            className="border-line min-h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold hover:bg-page"
          >
            {t('Default')}
          </button>
        </div>
        <p className="text-muted mt-1 text-xs">
          {t('Pilih satu warna; warna turunannya dibuat otomatis.')}
        </p>
        <div className="mb-4 mt-2 flex items-center gap-2" aria-hidden="true">
          <span
            className="border-line h-9 w-9 rounded-full border"
            style={{ backgroundColor: themePreview.primary }}
            title={t('Warna utama')}
          />
          <span
            className="border-line h-9 w-9 rounded-full border"
            style={{ backgroundColor: themePreview.soft }}
            title={t('Warna lembut')}
          />
          <span
            className="border-line h-9 w-9 rounded-full border"
            style={{ backgroundColor: themePreview.text }}
            title={t('Warna teks')}
          />
          <span
            className="border-line flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold"
            style={{
              backgroundColor: themePreview.primary,
              color: themePreview.onPrimary,
            }}
            title={t('Warna teks di atas warna utama')}
          >
            Aa
          </span>
        </div>

        <label className="block text-sm font-semibold" htmlFor="currency">
          {t('Mata uang')}
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(event) =>
            setCurrencyState(event.target.value as CurrencyCode)
          }
          className="border-line mt-1 mb-1 min-h-11 w-full rounded-lg border bg-card px-3 text-sm sm:w-64"
        >
          {CURRENCIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-muted mt-1 mb-4 text-xs">
          {t('Tanpa konversi kurs. Pilih mata uang yang sesuai dengan harga produk Anda.')}
        </p>

        <label
          className="block text-sm font-semibold"
          htmlFor="productsPerPage"
        >
          {t('Jumlah produk per muatan')}
        </label>
        <input
          id="productsPerPage"
          type="number"
          inputMode="numeric"
          min={MIN_PRODUCTS_PER_PAGE}
          max={MAX_PRODUCTS_PER_PAGE}
          step={1}
          value={productsPerPage}
          onChange={(event) => setProductsPerPage(event.target.value)}
          className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none sm:w-40"
        />
        <p className="text-muted mt-1 mb-4 text-xs">
          {t('Jumlah produk yang dimuat setiap kali halaman publik digulir (4–48).')}
        </p>

        <label className="block text-sm font-semibold" htmlFor="siteName">
          {t('Nama situs')}
        </label>
        <input
          id="siteName"
          value={siteName}
          onChange={(event) => setSiteName(event.target.value)}
          maxLength={60}
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label className="block text-sm font-semibold" htmlFor="bannerText">
          {t('Tagline banner atas (opsional)')}
        </label>
        <input
          id="bannerText"
          value={bannerText}
          onChange={(event) => setBannerText(event.target.value)}
          maxLength={120}
          placeholder={t('Contoh: Gratis ongkir untuk pembelian hari ini')}
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label className="block text-sm font-semibold" htmlFor="heroTitle">
          {t('Judul hero')}
        </label>
        <input
          id="heroTitle"
          value={heroTitle}
          onChange={(event) => setHeroTitle(event.target.value)}
          maxLength={120}
          placeholder={t('Pilihan terbaik, dikurasi untuk Anda')}
          className="border-line focus:border-primary mt-1 mb-4 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label className="block text-sm font-semibold" htmlFor="heroDescription">
          {t('Deskripsi hero')}
        </label>
        <textarea
          id="heroDescription"
          value={heroDescription}
          onChange={(event) => setHeroDescription(event.target.value)}
          maxLength={300}
          rows={3}
          className="border-line focus:border-primary mt-1 mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />

        <label
          className="block text-sm font-semibold"
          htmlFor="affiliateDisclosure"
        >
          {t('Pernyataan afiliasi (footer)')}
        </label>
        <textarea
          id="affiliateDisclosure"
          value={affiliateDisclosure}
          onChange={(event) => setAffiliateDisclosure(event.target.value)}
          maxLength={500}
          rows={3}
          className="border-line focus:border-primary mt-1 mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />

        <div className="border-line mt-2 border-t pt-4">
          <h2 className="font-bold">{t('Shopee Affiliate API (opsional)')}</h2>
          <p className="text-muted mt-1 text-xs">
            {t('Isi App ID dan Secret dari akun Shopee Affiliate Anda agar pengambilan data memakai jalur resmi. Detail kredensial tidak pernah dikirim kembali ke browser.')}
          </p>

          <label className="mt-3 block text-sm font-semibold" htmlFor="appId">
            {t('App ID')}
          </label>
          <input
            id="appId"
            value={shopeeAppId}
            onChange={(event) => setShopeeAppId(event.target.value)}
            maxLength={100}
            className="border-line focus:border-primary mt-1 mb-3 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
          />

          <label className="block text-sm font-semibold" htmlFor="appSecret">
            {t('App Secret')}
          </label>
          <input
            id="appSecret"
            type="password"
            value={shopeeAppSecret}
            onChange={(event) => setShopeeAppSecret(event.target.value)}
            autoComplete="new-password"
            placeholder={
              settings?.hasShopeeSecret
                ? t('Tersimpan — kosongkan untuk mempertahankan')
                : t('Belum diisi')
            }
            className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
          />

          {settings?.hasShopeeSecret && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clearShopeeCredentials}
                onChange={(event) =>
                  setClearShopeeCredentials(event.target.checked)
                }
                className="accent-primary h-5 w-5"
              />
              {t('Hapus kredensial Shopee yang tersimpan')}
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary mt-5 min-h-11 rounded-lg px-5 text-sm font-bold text-on-primary disabled:opacity-60"
        >
          {saving ? t('Menyimpan…') : t('Simpan Pengaturan')}
        </button>
      </form>

      <form
        onSubmit={changePassword}
        className="border-line mt-5 rounded-xl border bg-card p-5"
        noValidate
      >
        <h2 className="font-bold">{t('Ubah password')}</h2>
        <p className="text-muted mt-1 text-xs">
          {t('Sesi lain akan otomatis keluar setelah password diubah.')}
        </p>

        {passwordNotice && (
          <div
            role="alert"
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              passwordNotice.tone === 'ok'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {passwordNotice.text}
          </div>
        )}

        <label
          className="mt-3 block text-sm font-semibold"
          htmlFor="currentPassword"
        >
          {t('Password saat ini')}
        </label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          className="border-line focus:border-primary mt-1 mb-3 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <label
          className="block text-sm font-semibold"
          htmlFor="newPassword"
        >
          {t('Password baru')}
        </label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          className="border-line focus:border-primary mt-1 mb-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />
        <p className="text-muted mb-3 text-xs">{t('Minimal 10 karakter.')}</p>

        <label
          className="block text-sm font-semibold"
          htmlFor="confirmNewPassword"
        >
          {t('Konfirmasi password baru')}
        </label>
        <input
          id="confirmNewPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={changing}
          className="border-line mt-4 min-h-11 rounded-lg border px-5 text-sm font-bold hover:bg-page disabled:opacity-60"
        >
          {changing ? t('Mengubah…') : t('Ubah Password')}
        </button>
      </form>
    </section>
  )
}

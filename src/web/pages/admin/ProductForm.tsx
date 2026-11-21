import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { imageUrl } from '../../lib/format'
import { useLanguage } from '../../lib/language'
import type { Category } from '../../../shared/types'

export default function ProductForm() {
  const { id } = useParams()
  const productId = id ? Number(id) : null
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [categories, setCategories] = useState<Category[]>([])
  const [shopeeUrl, setShopeeUrl] = useState('')
  const [affiliateUrl, setAffiliateUrl] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [soldText, setSoldText] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageKey, setImageKey] = useState<string | null>(null)
  const [isTop, setIsTop] = useState(false)
  const [status, setStatus] = useState<'published' | 'hidden'>('published')

  const [loading, setLoading] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{
    tone: 'ok' | 'warn'
    text: string
  } | null>(null)

  async function handleFetch() {
    if (!shopeeUrl.trim()) {
      setNotice({ tone: 'warn', text: t('Tempel link Shopee terlebih dahulu.') })
      return
    }
    setNotice(null)
    setFetching(true)
    try {
      const data = await api.fetchShopee(shopeeUrl.trim())
      setTitle(data.title)
      setPrice(String(data.price))
      if (data.soldText) setSoldText(data.soldText)
      if (data.affiliateUrl) setAffiliateUrl(data.affiliateUrl)
      if (data.imageKey) setImageKey(data.imageKey)
      setNotice({
        tone: 'ok',
        text:
          data.source === 'affiliate_api'
            ? t('Data berhasil diambil melalui Shopee Affiliate API.')
            : t('Data berhasil diambil dari halaman publik Shopee.'),
      })
    } catch (err) {
      setNotice({
        tone: 'warn',
        text:
          err instanceof ApiError
            ? err.message
            : t('Data tidak dapat diambil otomatis. Silakan isi detail produk secara manual.'),
      })
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    let active = true
    api
      .categories()
      .then((data) => {
        if (active) setCategories(data.categories)
      })
      .catch(() => undefined)
    if (productId) {
      api
        .product(productId)
        .then(({ product }) => {
          if (!active) return
          setShopeeUrl(product.shopeeUrl)
          setAffiliateUrl(product.affiliateUrl ?? '')
          setTitle(product.title)
          setPrice(String(product.price))
          setSoldText(product.soldText ?? '')
          setCategoryId(product.categoryId ? String(product.categoryId) : '')
          setImageKey(product.imageKey)
          setIsTop(product.isTop)
          setStatus(product.status)
        })
        .catch((err) => {
      setError(
        err instanceof ApiError ? err.message : t('Gagal memuat produk.'),
      )
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [productId])

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const data = await api.upload(file)
      setImageKey(data.key)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Gagal mengunggah gambar.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const numericPrice = Number(price.replace(/[^0-9]/g, ''))
    if (!title.trim()) {
      setError(t('Nama produk wajib diisi.'))
      return
    }
    if (!shopeeUrl.trim()) {
      setError(t('Link Shopee wajib diisi.'))
      return
    }
    if (!Number.isFinite(numericPrice)) {
      setError(t('Harga tidak valid.'))
      return
    }

    const payload = {
      shopeeUrl: shopeeUrl.trim(),
      affiliateUrl: affiliateUrl.trim() || null,
      title: title.trim(),
      price: numericPrice,
      soldText: soldText.trim() || null,
      categoryId: categoryId ? Number(categoryId) : null,
      imageKey,
      isTop,
      status,
    }

    setSaving(true)
    try {
      if (productId) {
        await api.updateProduct(productId, payload)
      } else {
        await api.createProduct(payload)
      }
      navigate('/admin/produk')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('Gagal menyimpan produk.'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="bg-line/50 h-6 w-40 animate-pulse rounded" />
        <div className="bg-line/50 mt-4 h-96 animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">
        {productId ? t('Edit Produk') : t('Tambah Produk')}
      </h1>
      <p className="text-muted mt-1 text-sm">
        {t('Tempel link Shopee, lalu lengkapi detail produk.')}
      </p>

      <form
        onSubmit={handleSubmit}
        className="border-line mt-4 rounded-xl border bg-card p-5"
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

        <label className="block text-sm font-semibold" htmlFor="shopeeUrl">
          {t('Link Shopee')}
        </label>
        <div className="mt-1 mb-1 flex gap-2">
          <input
            id="shopeeUrl"
            value={shopeeUrl}
            onChange={(event) => setShopeeUrl(event.target.value)}
            placeholder="https://shopee.co.id/…-i.123.456"
            className="border-line focus:border-primary min-h-11 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching}
            className="border-primary text-primary-text min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold hover:bg-primary-soft disabled:opacity-60"
          >
            {fetching ? t('Mengambil…') : t('Ambil Data')}
          </button>
        </div>
        <p className="text-muted mb-3 text-xs">
          {t('Hanya mengambil data saat tombol ditekan. Tidak ada crawling otomatis.')}
        </p>

        {notice && (
          <div
            role="status"
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              notice.tone === 'ok'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="title">
              {t('Nama produk')}
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="price">
              {t('Harga (Rupiah)')}
            </label>
            <input
              id="price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="numeric"
              placeholder="150000"
              className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="category">
              {t('Kategori')}
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="border-line mt-1 min-h-11 w-full rounded-lg border bg-card px-3 text-sm"
            >
              <option value="">{t('Tanpa kategori')}</option>
              {categories
                .filter((item) => item.parentId === null)
                .map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {categories
                      .filter((item) => item.parentId === parent.id)
                      .map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              {categories.length === 0 && null}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="soldText">
              {t('Teks terjual (opsional)')}
            </label>
            <input
              id="soldText"
              value={soldText}
              onChange={(event) => setSoldText(event.target.value)}
              maxLength={40}
              placeholder={t('10RB+ terjual')}
              className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
            />
          </div>
        </div>

        <label
          className="mt-4 block text-sm font-semibold"
          htmlFor="affiliateUrl"
        >
          {t('Link afiliasi (opsional)')}
        </label>
        <input
          id="affiliateUrl"
          value={affiliateUrl}
          onChange={(event) => setAffiliateUrl(event.target.value)}
          placeholder="https://shope.ee/…"
          className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
        />
        <p className="text-muted mt-1 text-xs">
          {t('Jika kosong, pengunjung diarahkan ke link Shopee asli.')}
        </p>

        <div className="mt-4">
          <span className="block text-sm font-semibold">{t('Gambar produk')}</span>
          <div className="mt-2 flex items-center gap-3">
            {imageUrl(imageKey) ? (
              <img
                src={imageUrl(imageKey)!}
                alt={t('Pratinjau gambar produk')}
                width={72}
                height={72}
                className="border-line h-18 w-18 rounded-lg border object-cover"
              />
            ) : (
              <div className="bg-page text-muted border-line flex h-18 w-18 items-center justify-center rounded-lg border text-xs">
                {t('Belum ada')}
              </div>
            )}
            <div>
              <label
                htmlFor="imageFile"
                className="border-line inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-semibold hover:bg-page"
              >
                {uploading ? t('Mengunggah…') : t('Pilih gambar')}
              </label>
              <input
                id="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => handleUpload(event.target.files?.[0])}
              />
              <p className="text-muted mt-1 text-xs">
                {t('JPEG, PNG, atau WebP. Maks 5 MB.')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isTop}
              onChange={(event) => setIsTop(event.target.checked)}
              className="accent-primary h-5 w-5"
            />
            {t('Tandai TOP')}
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={status === 'published'}
              onChange={(event) =>
                setStatus(event.target.checked ? 'published' : 'hidden')
              }
              className="accent-primary h-5 w-5"
            />
            {t('Tampilkan di etalase')}
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-primary min-h-11 rounded-lg px-5 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {saving ? t('Menyimpan…') : t('Simpan')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/produk')}
            className="border-line min-h-11 rounded-lg border px-5 text-sm font-semibold hover:bg-page"
          >
            {t('Batal')}
          </button>
        </div>
      </form>
    </section>
  )
}

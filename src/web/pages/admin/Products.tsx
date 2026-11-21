import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { formatRupiah, imageUrl } from '../../lib/format'
import { useLanguage } from '../../lib/language'
import IconButton from '../../components/IconButton'
import {
  PencilIcon,
  RefreshIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
} from '../../components/icons'
import type { Category, Product } from '../../../shared/types'

const LIMIT = 20

export default function Products() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    api
      .categories()
      .then((data) => setCategories(data.categories))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .products({ q: search, category, status, page, limit: LIMIT })
      .then((data) => {
        if (!active) return
        setProducts(data.products)
        setTotal(data.total)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError ? err.message : t('Gagal memuat produk.'),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [search, category, status, page])

  async function toggleStatus(product: Product) {
    setBusyId(product.id)
    try {
      const next = product.status === 'published' ? 'hidden' : 'published'
      const data = await api.updateProduct(product.id, { status: next })
      setProducts((items) =>
        items.map((item) => (item.id === product.id ? data.product : item)),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Gagal mengubah status.'))
    } finally {
      setBusyId(null)
    }
  }

  async function sync(product: Product) {
    setBusyId(product.id)
    setError(null)
    try {
      const data = await api.syncProduct(product.id)
      setProducts((items) =>
        items.map((item) => (item.id === product.id ? data.product : item)),
      )
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('Gagal sinkron ulang produk.'),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function remove(product: Product) {
    const confirmed = window.confirm(
      t(
        'Hapus produk "{title}"? Gambar dan riwayat klik ikut dihapus. Tindakan ini tidak bisa dibatalkan.',
        { title: product.title },
      ),
    )
    if (!confirmed) return
    setBusyId(product.id)
    try {
      await api.deleteProduct(product.id)
      setProducts((items) => items.filter((item) => item.id !== product.id))
      setTotal((value) => Math.max(0, value - 1))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Gagal menghapus produk.'))
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('Produk')}</h1>
          <p className="text-muted mt-1 text-sm">
            {t('{count} produk tersimpan.', { count: total })}
          </p>
        </div>
        <Link
          to="/admin/produk/baru"
          className="bg-primary flex min-h-11 items-center rounded-lg px-4 text-sm font-bold text-on-primary hover:opacity-90"
        >
          {t('Tambah Produk')}
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Cari nama produk…')}
          aria-label={t('Cari produk')}
          className="border-line focus:border-primary min-h-11 flex-1 rounded-lg border bg-card px-3 text-sm outline-none"
        />
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            setPage(1)
          }}
          aria-label={t('Filter kategori')}
          className="border-line min-h-11 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">{t('Semua kategori')}</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          aria-label={t('Filter status')}
          className="border-line min-h-11 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">{t('Semua status')}</option>
          <option value="published">{t('Tampil')}</option>
          <option value="hidden">{t('Disembunyikan')}</option>
        </select>
      </div>

      <div className="border-line mt-4 overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="bg-line/50 h-12 w-12 animate-pulse rounded-lg" />
                <div className="bg-line/50 h-4 flex-1 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold">{t('Belum ada produk.')}</p>
            <p className="text-muted mt-1 text-sm">
              {t('Tambahkan produk pertama Anda dengan menempelkan link Shopee.')}
            </p>
            <Link
              to="/admin/produk/baru"
              className="bg-primary mt-4 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-bold text-on-primary"
            >
              {t('Tambah Produk')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-page text-muted text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('Produk')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Harga')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Kategori')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Klik')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {imageUrl(product.imageKey) ? (
                          <img
                            src={imageUrl(product.imageKey)!}
                            alt=""
                            width={48}
                            height={48}
                            className="border-line h-12 w-12 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="bg-page text-muted flex h-12 w-12 items-center justify-center rounded-lg text-xs">
                            —
                          </div>
                        )}
                        <div>
                          <p className="line-clamp-1 max-w-[260px] font-semibold">
                            {product.title}
                          </p>
                          {product.isTop && (
                            <span className="bg-primary-soft text-primary-ink mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold">
                              TOP
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatRupiah(product.price)}
                    </td>
                    <td className="text-muted px-4 py-3">
                      {product.categoryName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          product.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-page text-muted'
                        }`}
                      >
                        {product.status === 'published'
                          ? t('Tampil')
                          : t('Disembunyikan')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{product.clickCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          to={`/admin/produk/${product.id}`}
                          label={t('Edit')}
                          icon={<PencilIcon />}
                        />
                        <IconButton
                          label={t('Sinkron')}
                          icon={<RefreshIcon />}
                          onClick={() => sync(product)}
                          disabled={busyId === product.id}
                        />
                        <IconButton
                          label={
                            product.status === 'published'
                              ? t('Sembunyikan')
                              : t('Tampilkan')
                          }
                          icon={
                            product.status === 'published' ? (
                              <EyeOffIcon />
                            ) : (
                              <EyeIcon />
                            )
                          }
                          onClick={() => toggleStatus(product)}
                          disabled={busyId === product.id}
                        />
                        <IconButton
                          label={t('Hapus')}
                          icon={<TrashIcon />}
                          tone="danger"
                          onClick={() => remove(product)}
                          disabled={busyId === product.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
            className="border-line min-h-10 rounded-lg border bg-card px-3 font-semibold disabled:opacity-40"
          >
            {t('Sebelumnya')}
          </button>
          <span className="text-muted">
            {t('Halaman {page} dari {total}', {
              page,
              total: totalPages,
            })}
          </span>
          <button
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
            className="border-line min-h-10 rounded-lg border bg-card px-3 font-semibold disabled:opacity-40"
          >
            {t('Berikutnya')}
          </button>
        </div>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useLanguage } from '../lib/language'
import ProductGrid from '../components/ProductGrid'
import { ProductGridSkeleton } from '../components/Skeleton'
import type { PublicProduct, PublicProductList } from '../../shared/types'

const SORT_OPTIONS = [
  { value: 'popular', label: 'Terpopuler' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga terendah' },
  { value: 'price_desc', label: 'Harga tertinggi' },
]

const PAGE_SIZE = 24

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { t } = useLanguage()
  const sort = params.get('sort') ?? 'popular'

  const [data, setData] = useState<PublicProductList | null>(null)
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setProducts([])
    api
      .publicProducts({ category: slug, sort, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return
        setData(result)
        setProducts(result.products)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError
            ? err.message
            : t('Kategori gagal dimuat. Silakan coba lagi.'),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug, sort])

  async function loadMore() {
    if (!data || loadingMore) return
    const nextPage = Math.floor(products.length / PAGE_SIZE) + 1
    setLoadingMore(true)
    try {
      const result = await api.publicProducts({
        category: slug,
        sort,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      setProducts((items) => [...items, ...result.products])
      setData(result)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('Gagal memuat produk lainnya.'),
      )
    } finally {
      setLoadingMore(false)
    }
  }

  function changeSort(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'popular') next.delete('sort')
    else next.set('sort', value)
    setParams(next, { replace: true })
  }

  if (error) {
    return (
      <div className="border-line mt-6 rounded-xl border bg-card px-5 py-12 text-center">
        <p className="font-semibold">{error}</p>
        <Link
          to="/"
          className="text-primary-text mt-3 inline-block text-sm font-semibold"
        >
          {t('Kembali ke beranda')}
        </Link>
      </div>
    )
  }

  const category = data?.category
  const rootSlug = category?.parentId ? data?.parent?.slug : category?.slug
  const showChips = (data?.subcategories.length ?? 0) > 0

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-muted mt-4 flex flex-wrap gap-1.5 text-xs">
        <Link to="/" className="hover:text-primary-text">
          {t('Beranda')}
        </Link>
        {data?.parent && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/k/${data.parent.slug}`} className="hover:text-primary-text">
              {data.parent.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="text-ink font-semibold">
          {category?.name ?? t('Memuat…')}
        </span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">
            {category?.name ?? t('Kategori')}
          </h1>
          <p className="text-muted mt-0.5 text-sm">
            {t('{count} produk tersedia', { count: data?.total ?? 0 })}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted font-semibold">{t('Urutkan')}</span>
          <select
            value={sort}
            onChange={(event) => changeSort(event.target.value)}
            className="border-line min-h-11 rounded-lg border bg-card px-3 text-sm font-medium"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showChips && (
        <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto">
          {rootSlug && (
            <Link
              to={`/k/${rootSlug}`}
              className={`flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${
                category?.parentId
                  ? 'text-muted hover:bg-page'
                  : 'bg-primary-soft text-primary-ink'
              }`}
            >
              {t('Semua')}
            </Link>
          )}
          {data?.subcategories.map((child) => (
            <Link
              key={child.id}
              to={`/k/${child.slug}`}
              className={`flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${
                child.slug === slug
                  ? 'bg-primary-soft text-primary-ink'
                  : 'text-muted hover:bg-page'
              }`}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <ProductGrid
            products={products}
            emptyTitle="Belum ada produk di kategori ini."
            emptyDescription="Silakan jelajahi kategori lain atau kembali lagi nanti."
          />
        )}
      </div>

      {!loading && data && products.length < data.total && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="border-line min-h-11 rounded-lg border bg-card px-5 text-sm font-semibold hover:bg-page disabled:opacity-60"
          >
            {loadingMore ? t('Memuat…') : t('Muat lebih banyak')}
          </button>
        </div>
      )}
    </div>
  )
}

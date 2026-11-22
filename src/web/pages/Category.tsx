import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useLanguage } from '../lib/language'
import { useProductLayout } from '../lib/productLayout'
import { useSite } from '../components/PublicLayout'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger'
import LayoutToggle from '../components/LayoutToggle'
import ProductGrid from '../components/ProductGrid'
import { ProductGridSkeleton } from '../components/Skeleton'
import type { PublicProduct, PublicProductList } from '../../shared/types'

const SORT_OPTIONS = [
  { value: 'popular', label: 'Terpopuler' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga terendah' },
  { value: 'price_desc', label: 'Harga tertinggi' },
]

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { t } = useLanguage()
  const { settings } = useSite()
  const { layout, setLayout } = useProductLayout()
  const sort = params.get('sort') ?? 'popular'
  const limit = settings.productsPerPage

  const [data, setData] = useState<PublicProductList | null>(null)
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setLoadMoreError(null)
    setProducts([])
    setPage(1)
    setHasMore(false)

    api
      .publicProducts({ category: slug, sort, page: 1, limit })
      .then((result) => {
        if (requestIdRef.current !== requestId) return
        setData(result)
        setProducts(result.products)
        setPage(1)
        setHasMore(
          result.products.length > 0 && result.products.length < result.total,
        )
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return
        setError(
          err instanceof ApiError
            ? err.message
            : t('Kategori gagal dimuat. Silakan coba lagi.'),
        )
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }, [slug, sort, limit, t])

  async function loadMore() {
    if (!data || loading || loadingMore || !hasMore) return
    const requestId = requestIdRef.current
    const nextPage = page + 1
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const result = await api.publicProducts({
        category: slug,
        sort,
        page: nextPage,
        limit,
      })
      if (requestIdRef.current !== requestId) return
      const seen = new Set(products.map((item) => item.id))
      const nextLength =
        products.length +
        result.products.filter((item) => !seen.has(item.id)).length
      setProducts((items) => {
        const existing = new Set(items.map((item) => item.id))
        return [
          ...items,
          ...result.products.filter((item) => !existing.has(item.id)),
        ]
      })
      setData(result)
      setPage(nextPage)
      setHasMore(result.products.length > 0 && nextLength < result.total)
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      setLoadMoreError(
        err instanceof ApiError ? err.message : t('Gagal memuat produk lainnya.'),
      )
    } finally {
      if (requestIdRef.current === requestId) setLoadingMore(false)
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
        <div className="flex flex-wrap items-center gap-2">
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
          <LayoutToggle layout={layout} onChange={setLayout} />
        </div>
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
          <ProductGridSkeleton count={Math.min(limit, 8)} layout={layout} />
        ) : (
          <ProductGrid
            products={products}
            layout={layout}
            emptyTitle="Belum ada produk di kategori ini."
            emptyDescription="Silakan jelajahi kategori lain atau kembali lagi nanti."
          />
        )}
      </div>

      {!loading && (
        <InfiniteScrollTrigger
          hasMore={hasMore}
          loading={loadingMore}
          error={loadMoreError}
          layout={layout}
          skeletonCount={limit}
          onLoadMore={loadMore}
        />
      )}
    </div>
  )
}

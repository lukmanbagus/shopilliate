import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useLanguage } from '../lib/language'
import { useProductLayout } from '../lib/productLayout'
import { useSite } from '../components/PublicLayout'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger'
import LayoutToggle from '../components/LayoutToggle'
import ProductGrid from '../components/ProductGrid'
import { ProductGridSkeleton } from '../components/Skeleton'
import type { PublicProduct } from '../../shared/types'

export default function Search() {
  const [params] = useSearchParams()
  const { t } = useLanguage()
  const { settings } = useSite()
  const { layout, setLayout } = useProductLayout()
  const query = (params.get('q') ?? '').trim()
  const limit = settings.productsPerPage

  const [products, setProducts] = useState<PublicProduct[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    if (!query) {
      setProducts([])
      setTotal(0)
      setPage(1)
      setHasMore(false)
      setError(null)
      setLoadMoreError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setLoadMoreError(null)
    setProducts([])
    setPage(1)
    setHasMore(false)

    api
      .publicProducts({ q: query, page: 1, limit })
      .then((result) => {
        if (requestIdRef.current !== requestId) return
        setProducts(result.products)
        setTotal(result.total)
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
            : t('Pencarian gagal. Silakan coba lagi.'),
        )
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }, [query, limit, t])

  async function loadMore() {
    if (!query || loading || loadingMore || !hasMore) return
    const requestId = requestIdRef.current
    const nextPage = page + 1
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const result = await api.publicProducts({ q: query, page: nextPage, limit })
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
      setTotal(result.total)
      setPage(nextPage)
      setHasMore(result.products.length > 0 && nextLength < result.total)
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      setLoadMoreError(
        err instanceof ApiError
          ? err.message
          : t('Gagal memuat produk lainnya.'),
      )
    } finally {
      if (requestIdRef.current === requestId) setLoadingMore(false)
    }
  }

  if (!query) {
    return (
      <div className="border-line mt-6 rounded-xl border bg-card px-5 py-12 text-center">
        <p className="font-semibold">{t('Cari produk pilihan')}</p>
        <p className="text-muted mt-1 text-sm">
          {t('Ketik nama produk di kolom pencarian untuk mulai menjelajah.')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">
            {t('Hasil pencarian “{query}”', { query })}
          </h1>
          <p className="text-muted mt-0.5 text-sm">
            {error ? ' ' : t('{count} produk ditemukan', { count: total })}
          </p>
        </div>
        <LayoutToggle layout={layout} onChange={setLayout} />
      </div>

      {error ? (
        <div className="border-line mt-4 rounded-xl border bg-card px-5 py-12 text-center">
          <p className="font-semibold">{error}</p>
        </div>
      ) : loading ? (
        <div className="mt-4">
          <ProductGridSkeleton count={Math.min(limit, 8)} layout={layout} />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <ProductGrid
              products={products}
              layout={layout}
              emptyTitle={t('Tidak ada hasil untuk “{query}”.', { query })}
              emptyDescription="Coba kata kunci lain atau jelajahi kategori yang tersedia."
            />
          </div>
          <InfiniteScrollTrigger
            hasMore={hasMore}
            loading={loadingMore}
            error={loadMoreError}
            layout={layout}
            skeletonCount={limit}
            onLoadMore={loadMore}
          />
        </>
      )}
    </div>
  )
}

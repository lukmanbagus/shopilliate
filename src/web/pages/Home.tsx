import { useEffect, useRef, useState } from 'react'
import { useSite } from '../components/PublicLayout'
import CategorySlider from '../components/CategorySlider'
import Hero from '../components/Hero'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger'
import LayoutToggle from '../components/LayoutToggle'
import ProductGrid from '../components/ProductGrid'
import { ProductGridSkeleton } from '../components/Skeleton'
import { api, ApiError } from '../lib/api'
import { useLanguage } from '../lib/language'
import { useProductLayout } from '../lib/productLayout'
import type { PublicProduct } from '../../shared/types'

export default function Home() {
  const { settings, categories, topProducts } = useSite()
  const { t } = useLanguage()
  const { layout, setLayout } = useProductLayout()
  const parents = categories.filter((category) => category.parentId === null)
  const limit = settings.productsPerPage

  const [otherProducts, setOtherProducts] = useState<PublicProduct[]>([])
  const [totalOther, setTotalOther] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOther, setLoadingOther] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [otherError, setOtherError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoadingOther(true)
    setOtherError(null)
    setLoadMoreError(null)
    setOtherProducts([])
    setPage(1)
    setHasMore(false)

    api
      .publicProducts({ excludeTop: true, sort: 'newest', page: 1, limit })
      .then((result) => {
        if (requestIdRef.current !== requestId) return
        setOtherProducts(result.products)
        setTotalOther(result.total)
        setPage(1)
        setHasMore(
          result.products.length > 0 && result.products.length < result.total,
        )
      })
      .catch((err) => {
        if (requestIdRef.current !== requestId) return
        setOtherError(
          err instanceof ApiError
            ? err.message
            : t('Gagal memuat produk lainnya.'),
        )
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoadingOther(false)
      })
  }, [limit, t])

  async function loadMoreOther() {
    if (loadingOther || loadingMore || !hasMore) return
    const requestId = requestIdRef.current
    const nextPage = page + 1
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const result = await api.publicProducts({
        excludeTop: true,
        sort: 'newest',
        page: nextPage,
        limit,
      })
      if (requestIdRef.current !== requestId) return
      const seen = new Set(otherProducts.map((item) => item.id))
      const nextLength =
        otherProducts.length +
        result.products.filter((item) => !seen.has(item.id)).length
      setOtherProducts((items) => {
        const existing = new Set(items.map((item) => item.id))
        return [
          ...items,
          ...result.products.filter((item) => !existing.has(item.id)),
        ]
      })
      setTotalOther(result.total)
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

  const showOtherSection =
    loadingOther ||
    Boolean(otherError) ||
    otherProducts.length > 0 ||
    topProducts.length === 0

  return (
    <div>
      <Hero
        title={settings.heroTitle || t('Pilihan terbaik, dikurasi untuk Anda')}
        description={
          settings.heroDescription ||
          t('Temukan produk Shopee pilihan dengan harga terbaik. Setiap pembelian melalui tautan kami membantu situs ini tetap berjalan.')
        }
      />

      <CategorySlider categories={parents} />

      <section className="mt-10" aria-labelledby="top-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="top-heading" className="text-lg font-bold">
              {t('Pilihan Teratas')}
            </h2>
            <p className="text-muted mt-0.5 text-sm">
              {t('Produk andalan yang paling sering dipilih.')}
            </p>
          </div>
          <LayoutToggle layout={layout} onChange={setLayout} />
        </div>
        <div className="mt-4">
          <ProductGrid
            products={topProducts}
            layout={layout}
            emptyTitle="Belum ada produk bertanda TOP."
            emptyDescription="Admin dapat menandai produk sebagai TOP dari panel admin."
          />
        </div>
      </section>

      {showOtherSection && (
        <section className="mt-10" aria-labelledby="other-products-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="other-products-heading" className="text-lg font-bold">
                {t('Produk Lainnya')}
              </h2>
              <p className="text-muted mt-0.5 text-sm">
                {t('Jelajahi koleksi produk pilihan lainnya.')}
              </p>
            </div>
            {!loadingOther && totalOther > 0 && (
              <span className="text-muted shrink-0 text-xs font-medium">
                {t('{count} produk', { count: totalOther })}
              </span>
            )}
          </div>

          <div className="mt-4">
            {otherError ? (
              <div className="border-line rounded-xl border bg-card px-5 py-10 text-center">
                <p className="font-semibold">{otherError}</p>
              </div>
            ) : loadingOther ? (
              <ProductGridSkeleton
                count={Math.min(limit, 8)}
                layout={layout}
              />
            ) : (
              <ProductGrid products={otherProducts} layout={layout} />
            )}
          </div>

          {!loadingOther && !otherError && (
            <InfiniteScrollTrigger
              hasMore={hasMore}
              loading={loadingMore}
              error={loadMoreError}
              layout={layout}
              skeletonCount={limit}
              onLoadMore={loadMoreOther}
            />
          )}
        </section>
      )}
    </div>
  )
}

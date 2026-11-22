import { useEffect, useRef } from 'react'
import { useLanguage } from '../lib/language'
import type { ProductLayout } from './ProductCard'
import { ProductGridSkeleton } from './Skeleton'

interface Props {
  hasMore: boolean
  loading: boolean
  error?: string | null
  layout?: ProductLayout
  skeletonCount?: number
  onLoadMore: () => void
}

export default function InfiniteScrollTrigger({
  hasMore,
  loading,
  error = null,
  layout = 'grid',
  skeletonCount = 6,
  onLoadMore,
}: Props) {
  const { t } = useLanguage()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  useEffect(() => {
    if (!hasMore || loading || error) return
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current()
        }
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading, error])

  if (!hasMore && !loading && !error) return null

  return (
    <div className="mt-4">
      {loading && (
        <div role="status" aria-live="polite" className="space-y-3">
          <ProductGridSkeleton
            count={layout === 'list' ? Math.min(skeletonCount, 3) : Math.min(skeletonCount, 6)}
            layout={layout}
          />
          <p className="text-muted text-center text-xs">
            {t('Memuat produk lainnya…')}
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="border-line mt-4 rounded-xl border bg-card px-4 py-4 text-center">
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={onLoadMore}
            className="border-line mt-2 min-h-10 rounded-lg border bg-card px-4 text-xs font-semibold hover:bg-page"
          >
            {t('Coba lagi')}
          </button>
        </div>
      )}

      {hasMore && !loading && !error && (
        <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
      )}
    </div>
  )
}

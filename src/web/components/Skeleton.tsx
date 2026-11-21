import { CATEGORY_CARD_WIDTH_CLASS } from './CategorySlider'
import type { ProductLayout } from './ProductCard'

export function ProductCardSkeleton({
  layout = 'grid',
}: {
  layout?: ProductLayout
}) {
  if (layout === 'list') {
    return (
      <div className="border-line flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-2.5 sm:gap-4 sm:p-3">
        <div className="bg-line/40 h-24 w-24 shrink-0 animate-pulse rounded-lg sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="bg-line/40 h-4 w-3/4 animate-pulse rounded" />
          <div className="bg-line/40 h-4 w-1/2 animate-pulse rounded" />
          <div className="bg-line/40 h-5 w-1/3 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="border-line overflow-hidden rounded-xl border bg-card">
      <div className="bg-line/40 aspect-square w-full animate-pulse" />
      <div className="space-y-2 p-2.5 sm:p-3">
        <div className="bg-line/40 h-3.5 w-full animate-pulse rounded" />
        <div className="bg-line/40 h-3.5 w-2/3 animate-pulse rounded" />
        <div className="bg-line/40 h-5 w-1/2 animate-pulse rounded" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({
  count = 8,
  layout = 'grid',
}: {
  count?: number
  layout?: ProductLayout
}) {
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} layout="list" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} layout="grid" />
      ))}
    </div>
  )
}

export function PublicPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <div className="bg-line/40 mt-5 h-40 w-full animate-pulse rounded-2xl" />
      <div className="bg-line/40 mt-8 h-5 w-48 animate-pulse rounded" />
      <div className="mt-4 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`border-line h-20 shrink-0 animate-pulse rounded-xl border bg-card ${CATEGORY_CARD_WIDTH_CLASS}`}
          />
        ))}
      </div>
      <div className="mt-8">
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  )
}

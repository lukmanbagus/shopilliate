export function ProductCardSkeleton() {
  return (
    <div className="border-line overflow-hidden rounded-xl border bg-card">
      <div className="bg-line/40 aspect-square w-full animate-pulse" />
      <div className="space-y-2 p-3">
        <div className="bg-line/40 h-3.5 w-full animate-pulse rounded" />
        <div className="bg-line/40 h-3.5 w-2/3 animate-pulse rounded" />
        <div className="bg-line/40 h-5 w-1/2 animate-pulse rounded" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function PublicPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <div className="bg-line/40 mt-5 h-40 w-full animate-pulse rounded-2xl" />
      <div className="bg-line/40 mt-8 h-5 w-48 animate-pulse rounded" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border-line h-20 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
      <div className="mt-8">
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  )
}

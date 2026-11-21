import type { PublicProduct } from '../../shared/types'
import { useLanguage } from '../lib/language'
import ProductCard, { type ProductLayout } from './ProductCard'
import { ProductGridSkeleton } from './Skeleton'

const DEFAULT_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'

interface Props {
  products: PublicProduct[]
  layout?: ProductLayout
  gridClassName?: string
  loading?: boolean
  skeletonCount?: number
  emptyTitle?: string
  emptyDescription?: string
}

export default function ProductGrid({
  products,
  layout = 'grid',
  gridClassName,
  loading = false,
  skeletonCount = 8,
  emptyTitle = 'Belum ada produk.',
  emptyDescription = 'Produk akan tampil di sini setelah ditambahkan oleh admin.',
}: Props) {
  const { t } = useLanguage()
  if (loading) {
    return <ProductGridSkeleton count={skeletonCount} layout={layout} />
  }

  if (products.length === 0) {
    return (
      <div className="border-line rounded-xl border bg-card px-5 py-12 text-center">
        <p className="font-semibold">{t(emptyTitle)}</p>
        <p className="text-muted mt-1 text-sm">{t(emptyDescription)}</p>
      </div>
    )
  }

  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} layout="list" />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClassName ?? DEFAULT_GRID_CLASS}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} layout="grid" />
      ))}
    </div>
  )
}

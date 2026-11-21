import type { PublicProduct } from '../../shared/types'
import { useLanguage } from '../lib/language'
import ProductCard from './ProductCard'
import { ProductGridSkeleton } from './Skeleton'

interface Props {
  products: PublicProduct[]
  loading?: boolean
  skeletonCount?: number
  emptyTitle?: string
  emptyDescription?: string
}

export default function ProductGrid({
  products,
  loading = false,
  skeletonCount = 8,
  emptyTitle = 'Belum ada produk.',
  emptyDescription = 'Produk akan tampil di sini setelah ditambahkan oleh admin.',
}: Props) {
  const { t } = useLanguage()
  if (loading) return <ProductGridSkeleton count={skeletonCount} />

  if (products.length === 0) {
    return (
      <div className="border-line rounded-xl border bg-card px-5 py-12 text-center">
        <p className="font-semibold">{t(emptyTitle)}</p>
        <p className="text-muted mt-1 text-sm">{t(emptyDescription)}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

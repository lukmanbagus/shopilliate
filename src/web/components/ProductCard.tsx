import { formatRupiah, imageUrl } from '../lib/format'
import { trackClick } from '../lib/track'
import { useLanguage } from '../lib/language'
import type { PublicProduct } from '../../shared/types'

export default function ProductCard({ product }: { product: PublicProduct }) {
  const { t } = useLanguage()
  const image = imageUrl(product.imageKey)

  return (
    <a
      href={product.url}
      target="_blank"
      rel="sponsored nofollow noopener"
      onClick={() => trackClick(product.id)}
      className="group border-line flex flex-col overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="bg-page relative aspect-square w-full overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.title}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="text-muted flex h-full w-full items-center justify-center text-xs">
            {t('Tanpa gambar')}
          </div>
        )}
        {product.isTop && (
          <span className="bg-primary absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-extrabold text-[#2b0c03] uppercase">
            TOP
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium">
          {product.title}
        </h3>
        <p className="text-primary text-xl font-extrabold tracking-tight">
          {formatRupiah(product.price)}
        </p>
        {product.soldText && (
          <p className="text-muted text-xs">{product.soldText}</p>
        )}
      </div>
    </a>
  )
}

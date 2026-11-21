import { imageUrl } from '../lib/format'
import { useCurrency } from '../lib/currency'
import { trackClick } from '../lib/track'
import { useLanguage } from '../lib/language'
import type { PublicProduct } from '../../shared/types'

export type ProductLayout = 'grid' | 'list'

export default function ProductCard({
  product,
  layout = 'grid',
}: {
  product: PublicProduct
  layout?: ProductLayout
}) {
  const { t } = useLanguage()
  const { formatPrice } = useCurrency()
  const image = imageUrl(product.imageKey)

  if (layout === 'list') {
    return (
      <a
        href={product.url}
        target="_blank"
        rel="sponsored nofollow noopener"
        onClick={() => trackClick(product.id)}
        className="group border-line flex flex-row items-center gap-3 overflow-hidden rounded-xl border bg-card p-2.5 transition hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-3"
      >
        <div className="bg-page relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28">
          {image ? (
            <img
              src={image}
              alt={product.title}
              width={224}
              height={224}
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
            <span className="bg-primary absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-on-primary uppercase">
              TOP
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-base">
            {product.title}
          </h3>
          <p className="text-primary-text text-lg font-extrabold tracking-tight sm:text-xl">
            {formatPrice(product.price)}
          </p>
          {product.soldText && (
            <p className="text-muted text-xs">{product.soldText}</p>
          )}
        </div>
      </a>
    )
  }

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
          <span className="bg-primary absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-extrabold text-on-primary uppercase">
            TOP
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium">
          {product.title}
        </h3>
        <p className="text-primary-text text-base font-extrabold tracking-tight sm:text-lg">
          {formatPrice(product.price)}
        </p>
        {product.soldText && (
          <p className="text-muted text-xs">{product.soldText}</p>
        )}
      </div>
    </a>
  )
}

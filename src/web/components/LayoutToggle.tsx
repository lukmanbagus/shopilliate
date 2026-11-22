import type { ProductLayout } from './ProductCard'
import { LayoutGridIcon, LayoutListIcon } from './icons'
import { useLanguage } from '../lib/language'

export default function LayoutToggle({
  layout,
  onChange,
}: {
  layout: ProductLayout
  onChange: (next: ProductLayout) => void
}) {
  const { t } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('Ubah tampilan produk')}
      className="border-line inline-flex shrink-0 items-center gap-0.5 rounded-lg border bg-card p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={layout === 'grid'}
        aria-label={t('Tampilan grid')}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
          layout === 'grid'
            ? 'bg-primary-soft text-primary-ink'
            : 'text-muted hover:text-ink'
        }`}
      >
        <LayoutGridIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{t('Grid')}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={layout === 'list'}
        aria-label={t('Tampilan list')}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
          layout === 'list'
            ? 'bg-primary-soft text-primary-ink'
            : 'text-muted hover:text-ink'
        }`}
      >
        <LayoutListIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{t('List')}</span>
      </button>
    </div>
  )
}

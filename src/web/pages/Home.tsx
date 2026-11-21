import { useState } from 'react'
import { useSite } from '../components/PublicLayout'
import CategorySlider from '../components/CategorySlider'
import Hero from '../components/Hero'
import type { ProductLayout } from '../components/ProductCard'
import ProductGrid from '../components/ProductGrid'
import { LayoutGridIcon, LayoutListIcon } from '../components/icons'
import { useLanguage } from '../lib/language'

const LAYOUT_STORAGE_KEY = 'shopilliate:home-layout'

function readSavedLayout(): ProductLayout {
  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    return saved === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function Home() {
  const { settings, categories, topProducts } = useSite()
  const { t } = useLanguage()
  const [layout, setLayout] = useState<ProductLayout>(readSavedLayout)
  const parents = categories.filter((category) => category.parentId === null)

  const handleLayoutChange = (next: ProductLayout) => {
    setLayout(next)
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
    } catch {
      // Abaikan jika storage tidak tersedia (mis. mode privat ketat)
    }
  }

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
          <div
            role="group"
            aria-label={t('Ubah tampilan produk')}
            className="border-line inline-flex shrink-0 items-center gap-0.5 rounded-lg border bg-card p-0.5"
          >
            <button
              type="button"
              onClick={() => handleLayoutChange('grid')}
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
              onClick={() => handleLayoutChange('list')}
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
    </div>
  )
}

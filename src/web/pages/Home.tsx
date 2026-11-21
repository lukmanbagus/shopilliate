import { Link } from 'react-router-dom'
import { useSite } from '../components/PublicLayout'
import Hero from '../components/Hero'
import ProductGrid from '../components/ProductGrid'
import { imageUrl } from '../lib/format'
import { useLanguage } from '../lib/language'

export default function Home() {
  const { settings, categories, topProducts } = useSite()
  const { t } = useLanguage()
  const parents = categories.filter((category) => category.parentId === null)

  return (
    <div>
      <Hero
        title={settings.heroTitle || t('Pilihan terbaik, dikurasi untuk Anda')}
        description={
          settings.heroDescription ||
          t('Temukan produk Shopee pilihan dengan harga terbaik. Setiap pembelian melalui tautan kami membantu situs ini tetap berjalan.')
        }
      />

      <section className="mt-8" aria-labelledby="kategori-heading">
        <h2 id="kategori-heading" className="text-lg font-bold">
          {t('Belanja per Kategori')}
        </h2>
        {parents.length === 0 ? (
          <p className="border-line text-muted mt-3 rounded-xl border bg-card px-4 py-6 text-sm">
            {t('Belum ada kategori. Admin dapat menambahkannya dari panel admin.')}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {parents.map((category) => {
              const image = imageUrl(category.imageKey)
              return (
                <Link
                  key={category.id}
                  to={`/k/${category.slug}`}
                  className="border-line flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:shadow-sm"
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="border-line h-14 w-14 shrink-0 rounded-lg border object-cover"
                    />
                  ) : (
                    <span className="bg-primary-soft text-primary-ink flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {category.name}
                    </span>
                    <span className="text-muted block text-xs">
                      {t('{count} produk', {
                        count: category.productCount ?? 0,
                      })}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

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
        </div>
        <div className="mt-4">
          <ProductGrid
            products={topProducts}
            emptyTitle="Belum ada produk bertanda TOP."
            emptyDescription="Admin dapat menandai produk sebagai TOP dari panel admin."
          />
        </div>
      </section>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../../shared/types'
import { imageUrl } from '../lib/format'
import { useLanguage } from '../lib/language'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export const CATEGORY_CARD_WIDTH_CLASS =
  'w-[calc((100%-0.75rem)*3/4)] sm:w-[calc((100%-1.5rem)*3/7)] md:w-[calc((100%-2.25rem)*3/10)] lg:w-[calc((100%-3rem)*3/13)]'

export default function CategorySlider({
  categories,
}: {
  categories: Category[]
}) {
  const { t } = useLanguage()
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = trackRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollState)
      observer.observe(el)
    }
    window.addEventListener('resize', updateScrollState)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      observer?.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [categories.length, updateScrollState])

  const slide = (direction: 'prev' | 'next') => {
    const el = trackRef.current
    if (!el) return
    const distance = Math.max(Math.round(el.clientWidth * 0.8), 160)
    el.scrollBy({
      left: direction === 'next' ? distance : -distance,
      behavior: 'smooth',
    })
  }

  const showControls =
    categories.length > 0 && (canScrollLeft || canScrollRight)

  return (
    <section className="mt-8" aria-labelledby="kategori-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="kategori-heading" className="text-lg font-bold">
          {t('Belanja per Kategori')}
        </h2>
        {showControls && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => slide('prev')}
              disabled={!canScrollLeft}
              aria-label={t('Kategori sebelumnya')}
              className="border-line text-ink hover:bg-page inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-card transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => slide('next')}
              disabled={!canScrollRight}
              aria-label={t('Kategori berikutnya')}
              className="border-line text-ink hover:bg-page inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-card transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="border-line text-muted mt-3 rounded-xl border bg-card px-4 py-6 text-sm">
          {t('Belum ada kategori. Admin dapat menambahkannya dari panel admin.')}
        </p>
      ) : (
        <div
          ref={trackRef}
          className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        >
          {categories.map((category) => {
            const image = imageUrl(category.imageKey)
            return (
              <Link
                key={category.id}
                to={`/k/${category.slug}`}
                className={`border-line flex shrink-0 snap-start items-center gap-3 rounded-xl border bg-card p-3 transition hover:shadow-sm ${CATEGORY_CARD_WIDTH_CLASS}`}
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
  )
}

import { useLanguage } from '../lib/language'

export function SiteFooter({
  siteName,
  disclosure,
}: {
  siteName: string
  disclosure: string
}) {
  const { t } = useLanguage()
  const year = new Date().getFullYear()
  return (
    <footer className="border-line mt-8 border-t bg-card">
      <div className="text-muted mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs">
        <p>
          {disclosure ||
            t('Situs ini memuat tautan afiliasi. Kami dapat menerima komisi dari pembelian melalui tautan tersebut tanpa biaya tambahan untuk Anda.')}
        </p>
        <p className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {t('© {year} {siteName}. Harga dapat berubah sewaktu-waktu di Shopee.', {
              year,
              siteName,
            })}
          </span>
          <a
            href="https://lukmanbagus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-primary"
          >
            {t('Dibuat oleh')} Lukman Bagus
          </a>
        </p>
      </div>
    </footer>
  )
}

import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useLanguage } from '../lib/language'
import { APP_VERSION } from '../../shared/version'
import type { UpdateInfo } from '../../shared/types'

export default function AdminFooter() {
  const { t } = useLanguage()
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    api
      .updateInfo()
      .then((data) => {
        if (active) setInfo(data)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText('npm run update')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard bisa ditolak browser; biarkan pengguna menyalin manual.
    }
  }

  return (
    <footer className="border-line mt-8 border-t bg-card">
      <div className="text-muted mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs">
        <span>{t('Shopilliate v{version}', { version: APP_VERSION })}</span>

        {info?.updateAvailable && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary-soft rounded-full px-2.5 py-1 text-[11px] font-bold text-primary-ink">
              {t('Pembaruan tersedia: v{version}', {
                version: info.latestVersion,
              })}
            </span>
            {info.releaseUrl && (
              <a
                href={info.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:text-primary-text"
              >
                {t('Catatan rilis')}
              </a>
            )}
            <code className="border-line bg-page rounded-md border px-2 py-1 font-mono">
              npm run update
            </code>
            <button
              type="button"
              onClick={copyCommand}
              className="border-line min-h-8 rounded-md border px-2 font-semibold hover:bg-page"
            >
              {copied ? t('Tersalin') : t('Salin perintah')}
            </button>
          </div>
        )}

        {info?.checked && !info.updateAvailable && (
          <span>{t('Terbaru (v{version})', { version: info.latestVersion })}</span>
        )}
      </div>
    </footer>
  )
}

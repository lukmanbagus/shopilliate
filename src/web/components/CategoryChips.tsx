import { Link, useLocation } from 'react-router-dom'
import type { Category } from '../../shared/types'
import { useLanguage } from '../lib/language'

export default function CategoryChips({
  categories,
}: {
  categories: Category[]
}) {
  const { pathname } = useLocation()
  const { t } = useLanguage()
  const parents = categories.filter((category) => category.parentId === null)

  const chip = (active: boolean) =>
    `flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold transition ${
      active
        ? 'bg-primary-soft text-primary-ink'
        : 'text-muted hover:bg-page hover:text-ink'
    }`

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      <Link to="/" className={chip(pathname === '/')}>
        {t('Semua')}
      </Link>
      {parents.map((category) => (
        <Link
          key={category.id}
          to={`/k/${category.slug}`}
          className={chip(pathname === `/k/${category.slug}`)}
        >
          {category.name}
        </Link>
      ))}
    </div>
  )
}

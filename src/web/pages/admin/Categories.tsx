import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { imageUrl } from '../../lib/format'
import { useLanguage } from '../../lib/language'
import IconButton from '../../components/IconButton'
import { PencilIcon, TrashIcon } from '../../components/icons'
import type { Category } from '../../../shared/types'

interface FormState {
  id: number | null
  name: string
  parentId: string
  sortOrder: string
  imageKey: string | null
}

const emptyForm: FormState = {
  id: null,
  name: '',
  parentId: '',
  sortOrder: '0',
  imageKey: null,
}

export default function Categories() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const data = await api.categories()
    setCategories(data.categories)
  }

  useEffect(() => {
    reload()
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : t('Gagal memuat kategori.'),
        ),
      )
      .finally(() => setLoading(false))
  }, [])

  function startEdit(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      parentId: category.parentId ? String(category.parentId) : '',
      sortOrder: String(category.sortOrder),
      imageKey: category.imageKey,
    })
    setError(null)
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const data = await api.upload(file)
      setForm((current) => ({ ...current, imageKey: data.key }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Gagal mengunggah gambar.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError(t('Nama kategori wajib diisi.'))
      return
    }

    const payload = {
      name: form.name.trim(),
      parentId: form.parentId ? Number(form.parentId) : null,
      sortOrder: Number(form.sortOrder) || 0,
      imageKey: form.imageKey,
    }

    setSaving(true)
    try {
      if (form.id) {
        await api.updateCategory(form.id, payload)
      } else {
        await api.createCategory(payload)
      }
      await reload()
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Gagal menyimpan kategori.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove(category: Category) {
    const confirmed = window.confirm(
      t('Hapus kategori "{name}"? Produk di dalamnya tetap ada tanpa kategori.', {
        name: category.name,
      }),
    )
    if (!confirmed) return
    try {
      await api.deleteCategory(category.id)
      await reload()
      if (form.id === category.id) setForm(emptyForm)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('Gagal menghapus kategori.'))
    }
  }

  const parents = categories.filter((item) => item.parentId === null)
  const rows = parents.flatMap((parent) => [
    parent,
    ...categories.filter((item) => item.parentId === parent.id),
  ])

  return (
    <section>
      <h1 className="text-xl font-bold">{t('Kategori')}</h1>
      <p className="text-muted mt-1 text-sm">
        {t('Kelola kategori dan subkategori etalase Anda.')}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="border-line h-fit rounded-xl border bg-card p-5"
          noValidate
        >
          <h2 className="font-bold">
            {form.id ? t('Ubah kategori') : t('Kategori baru')}
          </h2>

          <label className="mt-3 block text-sm font-semibold" htmlFor="catName">
            {t('Nama kategori')}
          </label>
          <input
            id="catName"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            maxLength={50}
            className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
          />

          <label className="mt-3 block text-sm font-semibold" htmlFor="catParent">
            {t('Induk (opsional)')}
          </label>
          <select
            id="catParent"
            value={form.parentId}
            onChange={(event) =>
              setForm((current) => ({ ...current, parentId: event.target.value }))
            }
            className="border-line mt-1 min-h-11 w-full rounded-lg border bg-card px-3 text-sm"
          >
            <option value="">{t('Tanpa induk (kategori utama)')}</option>
            {parents
              .filter((item) => item.id !== form.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>

          <label className="mt-3 block text-sm font-semibold" htmlFor="catOrder">
            {t('Urutan')}
          </label>
          <input
            id="catOrder"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: event.target.value }))
            }
            inputMode="numeric"
            className="border-line focus:border-primary mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
          />

          <span className="mt-3 block text-sm font-semibold">
            {t('Gambar thumbnail (opsional)')}
          </span>
          <div className="mt-2 flex items-center gap-3">
            {imageUrl(form.imageKey) ? (
              <img
                src={imageUrl(form.imageKey)!}
                alt=""
                width={56}
                height={56}
                className="border-line h-14 w-14 rounded-lg border object-cover"
              />
            ) : (
              <div className="bg-page border-line flex h-14 w-14 items-center justify-center rounded-lg border text-xs text-muted">
                —
              </div>
            )}
            <label
              htmlFor="catImage"
              className="border-line inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-semibold hover:bg-page"
            >
              {uploading ? t('Mengunggah…') : t('Pilih gambar')}
            </label>
            <input
              id="catImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-primary min-h-11 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? t('Menyimpan…') : t('Simpan')}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="border-line min-h-11 rounded-lg border px-4 text-sm font-semibold"
              >
                {t('Batal')}
              </button>
            )}
          </div>
        </form>

        <div className="border-line overflow-hidden rounded-xl border bg-card">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-line/50 h-12 animate-pulse rounded" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold">{t('Belum ada kategori.')}</p>
              <p className="text-muted mt-1 text-sm">
                {t('Buat kategori pertama lewat formulir di samping.')}
              </p>
            </div>
          ) : (
            <ul className="divide-line divide-y">
              {rows.map((category) => (
                <li
                  key={category.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    category.parentId ? 'pl-9' : ''
                  }`}
                >
                  {imageUrl(category.imageKey) ? (
                    <img
                      src={imageUrl(category.imageKey)!}
                      alt=""
                      width={40}
                      height={40}
                      className="border-line h-10 w-10 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="bg-page text-muted flex h-10 w-10 items-center justify-center rounded-lg text-xs">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {category.parentId ? '↳ ' : ''}
                      {category.name}
                    </p>
                    <p className="text-muted truncate text-xs">
                      {t('/k/{slug} · {count} produk · urutan {order}', {
                        slug: category.slug,
                        count: category.productCount ?? 0,
                        order: category.sortOrder,
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      label={t('Edit')}
                      icon={<PencilIcon />}
                      onClick={() => startEdit(category)}
                    />
                    <IconButton
                      label={t('Hapus')}
                      icon={<TrashIcon />}
                      tone="danger"
                      onClick={() => remove(category)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

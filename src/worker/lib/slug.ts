export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function uniqueCategorySlug(
  db: D1Database,
  name: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(name) || 'kategori'
  let candidate = base
  let suffix = 1
  for (;;) {
    const row = await db
      .prepare('SELECT id FROM categories WHERE slug = ?1')
      .bind(candidate)
      .first<{ id: number }>()
    if (!row || row.id === excludeId) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
}

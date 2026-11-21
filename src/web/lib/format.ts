export function imageUrl(key: string | null | undefined): string | null {
  return key ? `/img/${key}` : null
}

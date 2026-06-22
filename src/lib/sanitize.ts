export function sanitizeText(value: string, maxLength = 500): string {
  return value
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .slice(0, maxLength)
}

export function sanitizeOptional(value: string | undefined | null, maxLength = 500): string | undefined {
  if (!value) return undefined
  const cleaned = sanitizeText(value, maxLength)
  return cleaned || undefined
}

export function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || ''

  if (source.length === 0) {
    return 'U'
  }

  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

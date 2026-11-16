const REDIRECT_BASE = 'https://cvmatch.local'

const AUTH_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const

/**
 * Only allow same-origin application paths as post-login destinations.
 * This prevents open redirects and avoids redirect loops back into auth pages.
 */
export function getSafeRedirectPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback
  }

  try {
    const target = new URL(value, REDIRECT_BASE)

    if (target.origin !== REDIRECT_BASE) {
      return fallback
    }

    const path = `${target.pathname}${target.search}${target.hash}`

    if (AUTH_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}#`))) {
      return fallback
    }

    return path
  } catch {
    return fallback
  }
}

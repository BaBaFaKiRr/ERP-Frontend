/** Relative post-auth path only — blocks open redirects via `//evil.com`. */
export function sanitizeAuthNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/'
  }
  return next
}

/**
 * Supabase email links (signup, invite, password recovery) land on `/auth/callback`.
 * Optional `next` sends the user to a follow-up page after the session is established.
 */
export function getAuthCallbackUrl(nextPath?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const devOverride = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.trim()
  const base =
    (devOverride ? devOverride : null) ??
    (origin ? `${origin}/auth/callback` : '/auth/callback')

  if (!nextPath) return base

  const url = new URL(base)
  url.searchParams.set('next', sanitizeAuthNextPath(nextPath))
  return url.toString()
}

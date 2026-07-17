import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // If Supabase falls back to the Site URL (redirect URL not allowlisted), auth
  // links land here with ?code=... — forward them to the callback so the code
  // is still exchanged for a session instead of being dropped at login.
  const params = await searchParams
  const code = typeof params.code === 'string' ? params.code : null
  if (code) {
    const qs = new URLSearchParams({ code })
    if (typeof params.next === 'string') qs.set('next', params.next)
    redirect(`/auth/callback?${qs.toString()}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  redirect('/auth/login')
}

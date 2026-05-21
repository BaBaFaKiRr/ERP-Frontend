'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LEJER_LOGO_MARK_SRC } from '@/lib/branding'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src={LEJER_LOGO_MARK_SRC}
          alt=""
          width={80}
          height={80}
          className="object-contain"
          priority
        />
        <div>
          <h1 className="mb-1 text-3xl font-bold tracking-tight">LEJER</h1>
          <p className="text-muted-foreground text-sm">Manufacturing ERP</p>
        </div>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    </div>
  )
}

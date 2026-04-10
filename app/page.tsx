'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Manufacturing ERP</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

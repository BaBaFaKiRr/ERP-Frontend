'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
/** Legacy route — onboarding wizard replaced this page. */
export default function OrgSetupPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/onboarding')
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <p className="text-muted-foreground text-sm">Redirecting to setup…</p>
    </div>
  )
}

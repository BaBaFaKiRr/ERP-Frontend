import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}

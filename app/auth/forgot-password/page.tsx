'use client'

import { getAuthCallbackUrl } from '@/lib/auth-redirect'
import { LEJER_LOGO_MARK_SRC } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl('/auth/reset-password'),
      })
      if (error) throw error
      setEmailSent(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src={LEJER_LOGO_MARK_SRC}
              alt=""
              width={72}
              height={72}
              className="object-contain"
              priority
            />
            <div>
              <p className="text-2xl font-semibold tracking-tight">LEJER</p>
              <p className="text-muted-foreground text-sm">Manufacturing ERP</p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Reset password</CardTitle>
              <CardDescription>
                {emailSent
                  ? 'Check your email for a reset link'
                  : 'Enter your account email and we will send you a reset link'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground text-sm">
                    If an account exists for <strong>{email}</strong>, you will
                    receive an email with a link to choose a new password. The
                    link expires after a short time.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/auth/login">Back to login</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending link...' : 'Send reset link'}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    Remember your password?{' '}
                    <Link
                      href="/auth/login"
                      className="underline underline-offset-4"
                    >
                      Login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

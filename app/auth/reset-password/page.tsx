'use client'

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
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Page() {
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const verifyRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError(
          'This reset link is invalid or has expired. Please request a new one.',
        )
        setCanReset(false)
      } else {
        setCanReset(true)
      }

      setIsCheckingSession(false)
    }

    void verifyRecoverySession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      await supabase.auth.signOut()
      router.push('/auth/login?reset=success')
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
              <CardTitle className="text-2xl">Choose a new password</CardTitle>
              <CardDescription>
                {isCheckingSession
                  ? 'Verifying your reset link...'
                  : canReset
                    ? 'Enter and confirm your new password'
                    : 'Unable to reset password'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCheckingSession ? (
                <p className="text-muted-foreground text-sm">Please wait...</p>
              ) : !canReset ? (
                <div className="flex flex-col gap-4">
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button asChild className="w-full">
                    <Link href="/auth/forgot-password">Request a new link</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/auth/login">Back to login</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="password">New password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password">
                        Confirm new password
                      </Label>
                      <Input
                        id="repeat-password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Updating password...' : 'Update password'}
                    </Button>
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

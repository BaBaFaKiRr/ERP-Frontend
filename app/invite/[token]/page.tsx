'use client'

import { type FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LEJER_LOGO_MARK_SRC } from '@/lib/branding'
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

type InvitationPreview = {
  valid: boolean
  email: string
  employeeName: string
  organizationName: string
  expiresAt: string
  expired: boolean
  alreadyAccepted: boolean
}

function getApiBase(): string {
  const url = process.env.NEXT_PUBLIC_ERP_API_URL
  if (!url) throw new Error('NEXT_PUBLIC_ERP_API_URL is not set')
  return url.replace(/\/$/, '')
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${getApiBase()}/api/invitations/${params.token}`)
        const body = await res.json()
        if (!res.ok) {
          throw new Error(body.error ?? 'Invitation not found')
        }
        setPreview(body.invitation as InvitationPreview)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load invitation')
      } finally {
        setLoading(false)
      }
    })()
  }, [params.token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/api/invitations/${params.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to create account')
      }
      setSuccess(body.message as string)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f8fafc] p-6 dark:bg-[#0f1219]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src={LEJER_LOGO_MARK_SRC} alt="" width={56} height={56} className="object-contain" />
          <div>
            <p className="text-xl font-semibold tracking-tight">LEJER ERP</p>
            <p className="text-muted-foreground text-sm">Accept your invitation</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your login</CardTitle>
            <CardDescription>
              {loading
                ? 'Loading invitation…'
                : preview
                  ? `${preview.organizationName} invited ${preview.employeeName}`
                  : 'Invitation details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Please wait…</p>
            ) : success ? (
              <div className="space-y-4">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
                <Button asChild className="w-full">
                  <Link href="/auth/login">Go to login</Link>
                </Button>
              </div>
            ) : preview && !preview.valid ? (
              <p className="text-sm text-destructive">
                {preview.alreadyAccepted
                  ? 'This invitation has already been used.'
                  : preview.expired
                    ? 'This invitation has expired. Ask your administrator for a new link.'
                    : 'This invitation is no longer valid.'}
              </p>
            ) : preview ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" value={preview.email} readOnly disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  After signing up, verify your email before logging in. This link expires{' '}
                  {new Date(preview.expiresAt).toLocaleString('en-IN')}.
                </p>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating account…' : 'Create ERP login'}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-destructive">{error ?? 'Invitation not found'}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LEJER_LOGO_MARK_SRC } from '@/lib/branding'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src={LEJER_LOGO_MARK_SRC}
          alt=""
          width={56}
          height={56}
          className="object-contain"
        />
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">LEJER</p>
      </div>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Authentication failed</h1>
        <p className="text-muted-foreground max-w-md text-center text-sm">
          The link may have expired or already been used. Try signing in again,
          or request a new password reset link.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/auth/forgot-password">Reset password</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

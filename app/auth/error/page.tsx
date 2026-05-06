import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sign-in failed</h1>
      <p className="text-muted-foreground text-center max-w-md text-sm">
        The session could not be established. Try again, or contact support if this keeps happening.
      </p>
      <Button asChild>
        <Link href="/auth/login">Back to login</Link>
      </Button>
    </div>
  )
}

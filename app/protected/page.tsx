import { redirect } from 'next/navigation'

/** Legacy path used by older templates; app lives under /dashboard. */
export default function ProtectedPage() {
  redirect('/dashboard')
}

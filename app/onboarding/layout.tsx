import Image from 'next/image'
import { LEJER_LOGO_MARK_SRC } from '@/lib/branding'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#f8fafc] dark:bg-[#0f1219]">
      <header className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#151922]/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Image src={LEJER_LOGO_MARK_SRC} alt="" width={32} height={32} className="object-contain" />
          <div>
            <p className="text-sm font-semibold tracking-tight">LEJER</p>
            <p className="text-muted-foreground text-xs">Account setup</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">{children}</main>
    </div>
  )
}

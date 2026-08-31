import Image from 'next/image'
import { LOGO_FULL_URL, COMPANY_ALT_TEXT } from '@/lib/branding'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-[160px] h-[58px] mb-6">
        <Image
          src={LOGO_FULL_URL}
          alt={COMPANY_ALT_TEXT}
          fill
          sizes="160px"
          className="object-contain"
          priority
        />
      </div>
      <div className="w-full max-w-2xl">{children}</div>
      <p className="text-xs text-slate-400 mt-6 text-center max-w-md">
        This is a secure link sent to you by email regarding a purchase order.
      </p>
    </div>
  )
}

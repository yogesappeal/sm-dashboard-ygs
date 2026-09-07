import Image from 'next/image'
import { LOGO_FULL_URL, BG_IMAGE_URL, COMPANY_ALT_TEXT } from '@/lib/branding'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* Left — 60% image panel */}
      <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden">
        <Image
          src={BG_IMAGE_URL}
          alt="background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-[#1a2e4a]/60 to-slate-900/80" />

        {/* Text pinned at 45% from top */}
        <div className="relative z-10 w-full" style={{ paddingTop: '35%', paddingLeft: '3rem', paddingRight: '3rem' }}>
          <h2 className="font-extrabold text-white leading-none mb-4" style={{ fontSize: '4.5rem', letterSpacing: '-0.02em' }}>
            SM Approval
          </h2>
          <p className="text-slate-300 text-lg whitespace-nowrap">
            Your workspace for managing projects and staying organized
          </p>
        </div>
      </div>

      {/* Right — 40% form panel */}
      <div className="flex-1 lg:w-[35%] flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Logo above Welcome back */}
          <div className="relative w-[180px] h-[66px] mb-6 mx-auto">
            <Image
              src={LOGO_FULL_URL}
              alt={COMPANY_ALT_TEXT}
              fill
              sizes="180px"
              className="object-contain"
              priority
            />
          </div>

          {children}
        </div>
      </div>

    </div>
  )
}

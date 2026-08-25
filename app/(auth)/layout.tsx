import Image from 'next/image'

const FULL_LOGO = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/company-logos/logo_ah.png`
const BG_IMAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/background/image-cover.jpg` //'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* Left — 60% image panel */}
      <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden">
        <Image
          src={BG_IMAGE}
          alt="background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-[#1a2e4a]/60 to-slate-900/80" />

        {/* Text pinned at 45% from top */}
        <div className="relative z-10 w-full" style={{ paddingTop: '35%', paddingLeft: '3rem', paddingRight: '3rem' }}>
          <h2 className="font-extrabold text-white leading-none mb-4" style={{ fontSize: '4.5rem', letterSpacing: '-0.02em' }}>
            SM Dashboard
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
              src={FULL_LOGO}
              alt="AusHail"
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

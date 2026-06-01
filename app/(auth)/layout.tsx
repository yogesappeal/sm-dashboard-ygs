import Image from 'next/image'

const FULL_LOGO = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/company-logos/logo_ah.png`

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src={FULL_LOGO}
              alt="AusHail"
              width={160}
              height={60}
              className="object-contain"
              priority
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

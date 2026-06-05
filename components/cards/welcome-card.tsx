'use client'

import Image from 'next/image'
import { getGreeting } from '@/lib/utils'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

const STORAGE_BASE = 'https://exlknzxmmqnehvximbyj.supabase.co'

interface WelcomeCardProps {
  firstName: string
  variant?: 'sm' | 'ops'
}

export function WelcomeCard({ firstName, variant = 'sm' }: WelcomeCardProps) {
  const greeting = getGreeting()
  const { user } = useAuthStore()

  const avatarUrl = user?.image_url
    ? user.image_url.startsWith('http')
      ? user.image_url
      : `${STORAGE_BASE}/${user.image_url.replace(/^\/+/, '')}`
    : null

  const initials = user?.first_name?.[0]?.toUpperCase() ?? '?'

  const Avatar = () => avatarUrl ? (
    <div className="relative w-20 h-20 shrink-0">
      <Image
        src={avatarUrl}
        alt={firstName}
        fill
        className="rounded-2xl object-cover ring-4 ring-white/30"
      />
    </div>
  ) : (
    <div className="w-20 h-20 rounded-2xl bg-white/20 ring-4 ring-white/30 flex items-center justify-center shrink-0">
      <span className="text-white text-2xl font-bold">{initials}</span>
    </div>
  )

  if (variant === 'ops') {
    return (
      <div className="bg-gradient-to-br from-[#D3BE39] to-[#B8A42A] rounded-xl p-5 h-full flex items-center justify-between overflow-hidden relative">
        <div className="flex flex-col justify-between h-full flex-1 min-w-0">
          <div>
            <p className="text-white/90 text-sm font-semibold">
              Hi {greeting}, <span className="text-white font-bold">{firstName}</span> 👋
            </p>
            <p className="text-white/80 text-xs font-semibold mt-1">
              {"Here's what you need to work on today"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Sparkles size={14} className="text-white/90" />
            <span className="text-white/90 text-xs font-bold">Operations Dashboard</span>
          </div>
        </div>
        <div className="ml-4">
          <Avatar />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#D3BE39] to-[#B8A42A] rounded-xl px-5 py-4 h-full flex items-center justify-between overflow-hidden relative">
      <div className="absolute right-0 top-0 w-36 h-36 rounded-full bg-black/5 -translate-y-10 translate-x-10" />

      <div className="flex flex-col justify-between h-full flex-1 min-w-0">
        <div>
          <p className="text-white/90 text-sm font-semibold">
            Hi {greeting}, <span className="text-white font-bold">{firstName}</span> 👋
          </p>
          <p className="text-white/80 text-xs font-semibold mt-1 leading-relaxed">
            {"Welcome back! Let's make today productive. Stay focused and move your projects forward."}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <Sparkles size={14} className="text-white/90" />
          <span className="text-white/90 text-xs font-bold">Site Manager Dashboard</span>
        </div>
      </div>

      <div className="ml-4 relative z-10 shrink-0">
        <Avatar />
      </div>
    </div>
  )
}

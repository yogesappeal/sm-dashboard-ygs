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
        className="rounded-2xl object-cover ring-4 ring-white/20"
      />
    </div>
  ) : (
    <div className="w-20 h-20 rounded-2xl bg-white/10 ring-4 ring-white/20 flex items-center justify-center shrink-0">
      <span className="text-white text-2xl font-bold">{initials}</span>
    </div>
  )

  if (variant === 'ops') {
    return (
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] rounded-xl p-5 text-white h-full flex items-center justify-between overflow-hidden relative">
        <div className="flex flex-col justify-between h-full flex-1 min-w-0">
          <div>
            <p className="text-slate-300 text-sm">
              Hi {greeting}, <span className="text-white font-semibold">{firstName}</span> 👋
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {"Here's what you need to work on today"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Sparkles size={14} className="text-[#C66EEB]" />
            <span className="text-[#C66EEB] text-xs font-medium">Operations Dashboard</span>
          </div>
        </div>
        <div className="ml-4">
          <Avatar />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] rounded-xl px-5 py-4 text-white h-full flex items-center justify-between overflow-hidden relative">
      <div className="absolute right-0 top-0 w-36 h-36 rounded-full bg-white/5 -translate-y-10 translate-x-10" />

      <div className="flex flex-col justify-between h-full flex-1 min-w-0">
        <div>
          <p className="text-slate-300 text-sm">
            Hi {greeting}, <span className="text-white font-semibold">{firstName}</span> 👋
          </p>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            {"Welcome back! Let's make today productive. Stay focused and move your projects forward."}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <Sparkles size={14} className="text-[#C66EEB]" />
          <span className="text-[#C66EEB] text-xs font-medium">Site Manager Dashboard</span>
        </div>
      </div>

      <div className="ml-4 relative z-10 shrink-0">
        <Avatar />
      </div>
    </div>
  )
}

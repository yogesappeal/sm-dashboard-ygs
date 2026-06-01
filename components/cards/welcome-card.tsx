import { getGreeting } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface WelcomeCardProps {
  firstName: string
  variant?: 'sm' | 'ops'
}

export function WelcomeCard({ firstName, variant = 'sm' }: WelcomeCardProps) {
  const greeting = getGreeting()

  if (variant === 'ops') {
    return (
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] rounded-xl p-5 text-white h-full flex flex-col justify-between">
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
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] rounded-xl p-5 text-white h-full flex flex-col justify-between">
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
  )
}

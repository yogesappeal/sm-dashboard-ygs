'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WelcomeModalProps {
  open: boolean
  onFinish: () => void
}

const STEPS = [
  {
    emoji: '🎉',
    title: 'Welcome to the SM Dashboard',
    description: "We're glad to have you here. Let's take a quick look at what you can do.",
  },
  {
    emoji: '📊',
    title: 'Your Dashboard Overview',
    description: 'Manage your client project data with ease, all your key metrics and updates organized in one clear view.',
  },
  {
    emoji: '🏗️',
    title: 'Scope Navigator',
    description: 'Find any building, trade, or scope in seconds, all organized in one place.',
  },
  {
    emoji: '📦',
    title: 'Track Purchase Order',
    description: 'Monitor PO status at a glance with clear indicators, from creation to completion.',
  },
]

export function WelcomeModal({ open, onFinish }: WelcomeModalProps) {
  const [step, setStep] = useState(0)

  function finish() {
    onFinish()
    setStep(0)
  }

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onFinish])

  if (!open) return null

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8 flex flex-col items-center text-center">
        <button
          onClick={finish}
          className="absolute top-5 right-5 w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors flex items-center justify-center"
        >
          <X size={16} />
        </button>

        <div className="w-20 h-20 rounded-full bg-[#6692C5]/10 flex items-center justify-center mt-4 mb-6 text-4xl">
          {current.emoji}
        </div>

        <h3 className="text-2xl font-semibold text-slate-800">{current.title}</h3>
        <p className="text-sm text-slate-500 mt-3 leading-relaxed max-w-sm">{current.description}</p>

        <div className="flex items-center gap-1.5 mt-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-all',
                i === step ? 'bg-[#6692C5]' : 'bg-slate-200'
              )}
            />
          ))}
        </div>

        <div className="flex justify-center gap-2.5 mt-8">
          <button
            onClick={() => (step === 0 ? finish() : setStep((s) => s - 1))}
            className="w-28 py-1.5 text-xs font-medium text-[#6692C5] bg-white border border-[#6692C5] hover:bg-[#6692C5]/5 rounded-lg transition-colors"
          >
            {step === 0 ? 'Skip' : 'Back'}
          </button>
          <button
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="w-28 py-1.5 text-xs font-medium text-white bg-[#6692C5] hover:bg-[#4F7CB3] rounded-lg transition-colors"
          >
            {isLast ? 'Get Started' : 'Continue'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/lib/utils/validation'

type ResetForm = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(data: ResetForm) {
    setServerError('')
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })
    if (error) {
      setServerError(error.message)
      return
    }
    router.push('/login?reset=1')
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10">
      <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
      <p className="text-slate-400 text-sm mb-8">Choose a strong new password.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            New password
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C66EEB] focus:border-transparent text-sm"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Confirm password
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C66EEB] focus:border-transparent text-sm"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{serverError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-[#C66EEB] hover:bg-[#b55fd4] text-white font-medium text-sm transition-colors disabled:opacity-60"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

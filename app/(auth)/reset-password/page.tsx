'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import type { EmailOtpType } from '@supabase/supabase-js'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/lib/utils/validation'

type ResetForm = z.infer<typeof resetPasswordSchema>

// Since the `auth-email-hook` Edge Function took over sending this email
// (see Resource/auth-email-hook-fe-integration.md), the link it sends no
// longer carries an already-active session the way Supabase's own default
// reset email used to (an access token in the URL hash, auto-detected on
// load) — it's `?token_hash=<...>&type=recovery` in the query string
// instead, a one-time code that has to be explicitly exchanged for a
// session via verifyOtp() before updateUser({ password }) has anything to
// act on. Calling updateUser() straight away (the old behavior here) fails
// with a raw "Auth session missing!" for every user landing from the new
// link format.
type VerifyState = 'verifying' | 'verified' | 'error'

function getFriendlyVerifyError(message: string): string {
  // Supabase's own wording for an already-used/expired recovery token is
  // usually "Token has expired or is invalid" — surfaced as-is it reads
  // like a developer/debug message, not something a user asked to reset
  // their password would know what to do with.
  if (/expired|invalid/i.test(message)) {
    return 'This password reset link has expired or has already been used. Please request a new one.'
  }
  return "We couldn't verify this password reset link. Please request a new one."
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [verifyState, setVerifyState] = useState<VerifyState>('verifying')
  const [verifyError, setVerifyError] = useState('')
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    // Reads straight from `window.location.search` (matching Resource/
    // auth-email-hook-fe-integration.md's own example) rather than
    // `next/navigation`'s useSearchParams() — that hook requires this page
    // to be wrapped in a <Suspense> boundary or the production build fails
    // outright ("useSearchParams() should be wrapped in a suspense
    // boundary"). Reading the URL directly, only inside this effect (so
    // only in the browser, never during the server/static build), sidesteps
    // that requirement entirely — nothing here needs the reactivity
    // useSearchParams offers anyway, since this only ever runs once.
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type') as EmailOtpType | null

    if (!tokenHash || !type) {
      // Deferred a tick (not called synchronously in the effect body) per
      // react-hooks/set-state-in-effect.
      Promise.resolve().then(() => {
        setVerifyError('This password reset link is missing or malformed. Please request a new one.')
        setVerifyState('error')
      })
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setVerifyError(getFriendlyVerifyError(error.message))
        setVerifyState('error')
        return
      }
      setVerifyState('verified')
    })
    // Only ever meant to run once, against whatever token_hash/type the
    // page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (verifyState === 'verifying') {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Loader2 className="animate-spin text-slate-400 mb-4" size={28} />
        <p className="text-slate-500 text-sm">Verifying your reset link…</p>
      </div>
    )
  }

  if (verifyState === 'error') {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="text-red-500" size={22} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Link no longer valid</h1>
        <p className="text-slate-500 text-sm">{verifyError}</p>
        <a
          href="/forgot-password"
          className="mt-6 inline-block text-sm text-primary hover:text-primary-dark"
        >
          Request a new reset link
        </a>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Set new password</h1>
      <p className="text-slate-500 text-sm mb-8">Choose a strong new password.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{serverError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/shared/toast'
import { changePasswordSchema } from '@/lib/utils/validation'
import { cn } from '@/lib/utils'

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const toast = useToast()
  const supabase = createClient()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
  })

  // Live mismatch feedback as the user types, instead of only surfacing it
  // after they hit submit.
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')
  const liveMismatch = !!confirmPassword && password !== confirmPassword

  async function onSubmit(data: ChangePasswordForm) {
    setServerError('')
    if (!user?.email) {
      setServerError('Could not resolve your account email. Please re-login and try again.')
      return
    }

    // Supabase's updateUser() never checks the current password — it just
    // needs an active session. Re-authenticating with the old password first
    // is the standard workaround to actually gate this on "do you know your
    // current password", since the Auth SDK has no dedicated verify-only call.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.oldPassword,
    })
    if (signInError) {
      setError('oldPassword', { message: 'Current password is incorrect' })
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: data.password })
    if (updateError) {
      setServerError(updateError.message)
      return
    }

    toast('Password updated successfully.', 'success')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-800">Change Password</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Current Password" error={errors.oldPassword?.message}>
              <PasswordInput
                register={register('oldPassword')}
                autoComplete="current-password"
                hasError={!!errors.oldPassword}
                autoFocus
              />
            </Field>

            <Field label="New Password" error={errors.password?.message}>
              <PasswordInput
                register={register('password')}
                autoComplete="new-password"
                hasError={!!errors.password}
              />
            </Field>

            <Field label="Confirm New Password" error={errors.confirmPassword?.message}>
              <PasswordInput
                register={register('confirmPassword')}
                autoComplete="new-password"
                hasError={!!errors.confirmPassword}
              />
            </Field>

            {serverError && (
              <p className="text-xs text-red-500 text-center">{serverError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || liveMismatch}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Update Password
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function PasswordInput({
  register,
  autoComplete,
  hasError,
  autoFocus,
}: {
  register: UseFormRegisterReturn
  autoComplete: string
  hasError: boolean
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...register}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={cn(inputCls(hasError), 'pr-10')}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
    'focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}

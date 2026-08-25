'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { createSupplierData } from '@/lib/api'
import { supplierCreateSchema } from '@/lib/utils/validation'
import { useToast } from '@/components/shared/toast'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'
import type { z } from 'zod'

type SupplierForm = z.infer<typeof supplierCreateSchema>

interface SupplierCreateModalProps {
  token: string
  onClose: () => void
  queryKey: unknown[]
}

export function SupplierCreateModal({ token, onClose, queryKey }: SupplierCreateModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: { type: 'supplier', email: '', phone: '', address: '', notes: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: SupplierForm) => createSupplierData(token, { ...data, company: 'AusHail' }),
    onSuccess: () => {
      toast(messages.supplier.createSuccess, 'success')
      onClose()
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[437px] bg-white border-l border-slate-200 shadow-xl flex flex-col rounded-tl-[50px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">New Entry</p>
            <p className="font-medium text-slate-800">Add New Supplier</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <Field label="Name" required error={errors.name?.message}>
            <input
              {...register('name')}
              className={inputCls(!!errors.name)}
              placeholder="Supplier / subcontractor name"
              autoFocus
            />
          </Field>

          <Field label="Type" required error={errors.type?.message}>
            <select {...register('type')} className={inputCls(!!errors.type)}>
              <option value="supplier">Supplier</option>
              <option value="subcontractor">Subcontractor</option>
            </select>
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <input
              {...register('phone')}
              className={inputCls(!!errors.phone)}
              placeholder="Phone number (optional)"
            />
          </Field>

          <Field label="Email" required error={errors.email?.message}>
            <input
              {...register('email')}
              className={inputCls(!!errors.email)}
              placeholder="Email address"
            />
          </Field>

          <Field label="Address" error={errors.address?.message}>
            <textarea
              {...register('address')}
              rows={3}
              className={inputCls(!!errors.address)}
              placeholder="Full address (optional)"
            />
          </Field>

          <Field label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={3}
              className={inputCls(false)}
              placeholder="Additional notes (optional)"
            />
          </Field>

          {createMutation.isError && (
            <p className="text-xs text-red-500 text-center">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : messages.supplier.createError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {(isSubmitting || createMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
              Add Supplier
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
    </>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

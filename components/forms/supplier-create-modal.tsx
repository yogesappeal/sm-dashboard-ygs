'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { updateSupplierData } from '@/lib/api'
import { supplierSchema } from '@/lib/utils/validation'
import { cn } from '@/lib/utils'
import type { z } from 'zod'

type SupplierForm = z.infer<typeof supplierSchema>

interface SupplierCreateModalProps {
  token: string
  onClose: () => void
  queryKey: unknown[]
}

export function SupplierCreateModal({ token, onClose, queryKey }: SupplierCreateModalProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { type: 'supplier', email: '', notes: '', company: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: SupplierForm) => updateSupplierData(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Add New Supplier</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <Field label="Name *" error={errors.name?.message}>
            <input
              {...register('name')}
              className={inputCls(!!errors.name)}
              placeholder="Supplier / subcontractor name"
              autoFocus
            />
          </Field>

          <Field label="Company" error={errors.company?.message}>
            <input
              {...register('company')}
              className={inputCls(false)}
              placeholder="Company name (optional)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone *" error={errors.phone?.message}>
              <input
                {...register('phone')}
                className={inputCls(!!errors.phone)}
                placeholder="Phone number"
              />
            </Field>
            <Field label="Type *" error={errors.type?.message}>
              <select {...register('type')} className={inputCls(!!errors.type)}>
                <option value="supplier">Supplier</option>
                <option value="subcontractor">Subcontractor</option>
              </select>
            </Field>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <input
              {...register('email')}
              className={inputCls(!!errors.email)}
              placeholder="Email address (optional)"
            />
          </Field>

          <Field label="Address *" error={errors.address?.message}>
            <textarea
              {...register('address')}
              rows={2}
              className={inputCls(!!errors.address)}
              placeholder="Full address"
            />
          </Field>

          <Field label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={2}
              className={inputCls(false)}
              placeholder="Additional notes (optional)"
            />
          </Field>

          {createMutation.isError && (
            <p className="text-xs text-red-500 text-center">Failed to create supplier. Please try again.</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit((d) => createMutation.mutateAsync(d))}
            disabled={isSubmitting || createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C66EEB] hover:bg-[#A855D4] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {(isSubmitting || createMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
            Add Supplier
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
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
    'focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}

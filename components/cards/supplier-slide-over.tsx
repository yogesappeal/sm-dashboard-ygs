'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Building2, Mail, Phone, MapPin, FileText, Edit2, Check, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { updateSupplierStatus, updateSupplierData } from '@/lib/api'
import { supplierSchema } from '@/lib/utils/validation'
import { useToast } from '@/components/shared/toast'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'
import type { SupplierData } from '@/lib/types'
import type { z } from 'zod'

type SupplierForm = z.infer<typeof supplierSchema>

interface SupplierSlideOverProps {
  supplier: SupplierData | null
  token: string
  onClose: () => void
  queryKey: unknown[]
}

export function SupplierSlideOver({ supplier, token, onClose, queryKey }: SupplierSlideOverProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    values: supplier
      ? {
          name: supplier.name,
          email: supplier.email || '',
          phone: supplier.phone,
          address: supplier.address,
          type: supplier.type,
          notes: supplier.notes || '',
        }
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: SupplierForm) =>
      updateSupplierData(token, { supplier: supplier!.id, ...data, company: supplier!.company || 'AusHail' }),
    onSuccess: () => {
      toast(messages.supplier.updateSuccess, 'success')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleToggleStatus = async () => {
    if (!supplier) return
    const newStatus = supplier.status === 'Active Supplier' ? 'Inactive' : 'Active Supplier'
    setStatusLoading(true)
    try {
      await updateSupplierStatus(token, supplier.id, newStatus)
      queryClient.invalidateQueries({ queryKey })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    reset()
  }

  if (!supplier) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[437px] bg-white border-l border-slate-200 shadow-xl flex flex-col rounded-tl-[50px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">Supplier Code</p>
            <p className="font-medium text-slate-800 truncate">{supplier.supplier_code || '-'}</p>
          </div>
          {!isEditing && (
            <PermissionGuard action="supplier:edit">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6692C5] border border-[#6692C5] rounded-lg hover:bg-[#6692C5]/5 transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            </PermissionGuard>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isEditing ? (
            <form onSubmit={handleSubmit((d) => updateMutation.mutateAsync(d))} className="space-y-4">
              <Field label="Name" error={errors.name?.message}>
                <input
                  {...register('name')}
                  className={inputCls(!!errors.name)}
                  placeholder="Supplier name"
                />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input
                  {...register('phone')}
                  className={inputCls(!!errors.phone)}
                  placeholder="Phone number"
                />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input
                  {...register('email')}
                  className={inputCls(!!errors.email)}
                  placeholder="Email address"
                />
              </Field>
              <Field label="Type" error={errors.type?.message}>
                <select {...register('type')} className={inputCls(!!errors.type)}>
                  <option value="supplier">Supplier</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </Field>
              <Field label="Address" error={errors.address?.message}>
                <textarea
                  {...register('address')}
                  rows={3}
                  className={inputCls(!!errors.address)}
                  placeholder="Full address"
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

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {(isSubmitting || updateMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {updateMutation.isError && (
                <p className="text-xs text-red-500 text-center">{messages.supplier.updateError}</p>
              )}
            </form>
          ) : (
            <div className="space-y-5">
              {/* Type + Status row */}
              <div className="flex items-center gap-2">
                <StatusBadge status={supplier.type === 'supplier' ? 'supplier' : 'subcontractor'} />
                <StatusBadge status={supplier.status || 'Inactive'} />
              </div>

              {/* Info fields */}
              <InfoRow icon={<Building2 size={15} />} label="Name" value={supplier.name} />
              {supplier.company && (
                <InfoRow icon={<Building2 size={15} />} label="Company" value={supplier.company} />
              )}
              <InfoRow icon={<Phone size={15} />} label="Phone" value={supplier.phone} />
              <InfoRow icon={<Mail size={15} />} label="Email" value={supplier.email || '-'} />
              <InfoRow icon={<MapPin size={15} />} label="Address" value={supplier.address} multiline />
              {supplier.notes && (
                <InfoRow icon={<FileText size={15} />} label="Notes" value={supplier.notes} multiline />
              )}

              {/* Status toggle */}
              <PermissionGuard action="supplier:status">
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-3">Supplier Status</p>
                  <button
                    onClick={handleToggleStatus}
                    disabled={statusLoading}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                      supplier.status === 'Active Supplier'
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50',
                      statusLoading && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {statusLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {supplier.status === 'Active Supplier' ? 'Set as Inactive' : 'Set as Active'}
                  </button>
                </div>
              </PermissionGuard>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({
  icon,
  label,
  value,
  multiline,
}: {
  icon: React.ReactNode
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-5 pt-0.5 text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className={cn('text-sm text-slate-700', !multiline && 'truncate')}>{value || '-'}</p>
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
    'focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}

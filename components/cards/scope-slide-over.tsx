'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ClipboardList, FileText, Layers, Edit2, Loader2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { updateScopeData } from '@/lib/api'
import { scopeDraftsToItems, scopeDetailsToDrafts, normalizeScopeType, scopeTypeToLabel } from '@/lib/utils/scope'
import { ScopeItemsBuilder } from '@/components/forms/scope-items-builder'
import { useToast } from '@/components/shared/toast'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'
import type { ScopeData, ScopeTradeDraft } from '@/lib/types'

interface ScopeForm {
  scope_name: string
  type: string
  notes: string
}

interface ScopeSlideOverProps {
  scope: ScopeData | null
  token: string
  onClose: () => void
  queryKey: unknown[]
}

export function ScopeSlideOver({ scope, token, onClose, queryKey }: ScopeSlideOverProps) {
  const [isEditing, setIsEditing] = useState(false)
  // TEMP: testing a trade-first input flow — see scope-items-builder.tsx.
  const [buildings, setBuildings] = useState<string[]>([])
  const [trades, setTrades] = useState<ScopeTradeDraft[]>([])
  const queryClient = useQueryClient()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScopeForm>({
    values: scope
      ? {
          scope_name: scope.scope_name,
          type: normalizeScopeType(scope.type),
          notes: scope.notes || '',
        }
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: ScopeForm) =>
      updateScopeData(token, {
        scope_id: scope!.scope_id,
        ...data,
        type: scopeTypeToLabel(data.type as 'supplier' | 'subcontractor' | 'both'),
        items: scopeDraftsToItems(buildings, trades),
      }),
    onSuccess: () => {
      toast(messages.scope.updateSuccess, 'success')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleStartEdit = () => {
    // Pre-populate buildings/trades from existing scope_details
    const { buildings: existingBuildings, trades: existingTrades } = scopeDetailsToDrafts(scope?.scope_details ?? [])
    setBuildings(existingBuildings)
    setTrades(existingTrades)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    reset()
  }

  if (!scope) return null

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
            <p className="text-xs text-slate-400">Scope Number</p>
            <p className="font-medium text-slate-800 truncate">{scope.scope_number || '-'}</p>
          </div>
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6692C5] border border-[#6692C5] rounded-lg hover:bg-[#6692C5]/5 transition-colors"
            >
              <Edit2 size={14} />
              Edit
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isEditing ? (
            <form onSubmit={handleSubmit((d) => updateMutation.mutateAsync(d))} className="space-y-4">
              <Field label="Scope Name *" error={errors.scope_name?.message}>
                <input
                  {...register('scope_name', { required: 'Scope name is required' })}
                  className={inputCls(!!errors.scope_name)}
                  placeholder="e.g. Full House Package"
                />
              </Field>

              <Field label="Type *" error={errors.type?.message}>
                <select
                  {...register('type', { required: 'Type is required' })}
                  className={inputCls(!!errors.type)}
                >
                  <option value="supplier">Supplier</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="both">Both</option>
                </select>
              </Field>

              {/* Scope Items */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Scope Items</label>
                <ScopeItemsBuilder
                  buildings={buildings}
                  trades={trades}
                  onBuildingsChange={setBuildings}
                  onTradesChange={setTrades}
                />
              </div>

              <Field label="Notes" error={undefined}>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className={inputCls(false)}
                  placeholder="Additional notes (optional)"
                />
              </Field>

              {updateMutation.isError && (
                <p className="text-xs text-red-500 text-center">{messages.scope.updateError}</p>
              )}

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
            </form>
          ) : (
            <div className="space-y-5">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {scope.type
                  ? scope.type.split(',').map((t) => {
                      const label = t.trim()
                      const isSubs = label.toLowerCase().includes('sub')
                      return (
                        <span
                          key={label}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isSubs
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSubs ? 'bg-purple-500' : 'bg-blue-400'}`} />
                          {label}
                        </span>
                      )
                    })
                  : '-'}
                <StatusBadge status={scope.order_status || 'Inactive'} />
              </div>

              <InfoRow icon={<ClipboardList size={15} />} label="Scope Name" value={scope.scope_name} />
              <InfoRow
                icon={<FileText size={15} />}
                label="Contract"
                value={scope.client_ra_number ? `${scope.client_ra_number} — ${scope.client_full_name}` : scope.client_full_name}
              />
              {scope.street_address && (
                <InfoRow icon={<FileText size={15} />} label="Address" value={scope.street_address} />
              )}
              {scope.builder && (
                <InfoRow icon={<FileText size={15} />} label="Builder" value={scope.builder} />
              )}
              {scope.notes && (
                <InfoRow icon={<FileText size={15} />} label="Notes" value={scope.notes} multiline />
              )}

              {/* Scope Items */}
              {scope.scope_details && scope.scope_details.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={15} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Scope Items ({scope.scope_details.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {scope.scope_details.map((item, idx) => (
                      <div
                        key={item.building_id || idx}
                        className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-slate-700">{item.building_name || '-'}</p>
                          <StatusBadge status={item.status} />
                        </div>
                        {item.trades.length > 0 && (
                          <p className="text-xs text-slate-400">{item.trades.map((t) => t.trade_name).join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

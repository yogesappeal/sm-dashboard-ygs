'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { insertScopeWithItems } from '@/lib/api'
import { searchContract } from '@/lib/api'
import { generateScopeItem } from '@/lib/utils/scope'
import { cn } from '@/lib/utils'
import type { ScopeItem } from '@/lib/types'

interface ScopeForm {
  scopeName: string
  contractId: string
  type: string
  notes: string
}

interface ScopeCreateModalProps {
  token: string
  onClose: () => void
  queryKey: unknown[]
}

export function ScopeCreateModal({ token, onClose, queryKey }: ScopeCreateModalProps) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ScopeItem[]>([generateScopeItem('', '')])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ScopeForm>({
    defaultValues: { type: 'supplier', notes: '' },
  })

  // Load contracts for dropdown
  const { data: contractsData } = useQuery({
    queryKey: ['contracts-search', ''],
    queryFn: () => searchContract(token, ''),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
  const contracts = contractsData?.data ?? []

  const createMutation = useMutation({
    mutationFn: (data: ScopeForm) =>
      insertScopeWithItems(token, {
        scope_name: data.scopeName,
        contract_id: data.contractId,
        type: data.type,
        notes: data.notes,
        items: items
          .filter((i) => i.buildingName.trim())
          .map((i) => ({ building_name: i.buildingName, trade_items: i.tradeItems })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onClose()
    },
  })

  const addItem = () => setItems((prev) => [...prev, generateScopeItem('', '')])
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))
  const updateItem = (id: string, field: keyof ScopeItem, value: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Create Scope of Work</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Scope name */}
          <Field label="Scope Name *" error={errors.scopeName?.message}>
            <input
              {...register('scopeName', { required: 'Scope name is required' })}
              className={inputCls(!!errors.scopeName)}
              placeholder="e.g. Full House Package"
              autoFocus
            />
          </Field>

          {/* Contract */}
          <Field label="Contract *" error={errors.contractId?.message}>
            <select
              {...register('contractId', { required: 'Contract is required' })}
              className={inputCls(!!errors.contractId)}
            >
              <option value="">Select contract…</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.project_name}
                </option>
              ))}
            </select>
          </Field>

          {/* Type */}
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

          {/* Scope items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Scope Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-[#C66EEB] hover:text-[#A855D4] transition-colors"
              >
                <Plus size={12} /> Add Building
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start bg-slate-50 rounded-xl p-3">
                  <div className="flex-1 space-y-2">
                    <input
                      value={item.buildingName}
                      onChange={(e) => updateItem(item.id, 'buildingName', e.target.value)}
                      placeholder="Building name (e.g. House, Garage)"
                      className={inputCls(false)}
                    />
                    <input
                      value={item.tradeItems}
                      onChange={(e) => updateItem(item.id, 'tradeItems', e.target.value)}
                      placeholder="Trade items (e.g. Roofing, Interior)"
                      className={inputCls(false)}
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors mt-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes" error={undefined}>
            <textarea
              {...register('notes')}
              rows={3}
              className={inputCls(false)}
              placeholder="Additional notes (optional)"
            />
          </Field>

          {createMutation.isError && (
            <p className="text-xs text-red-500 text-center">Failed to create scope. Please try again.</p>
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
            Create Scope
          </button>
        </div>
      </div>
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
    'focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]',
    hasError ? 'border-red-300' : 'border-slate-200'
  )
}

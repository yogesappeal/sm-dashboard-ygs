'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { insertScopeWithItems, getDropdownContractScope } from '@/lib/api'
import { scopeDraftsToItems, scopeTypeToLabel } from '@/lib/utils/scope'
import { ScopeItemsBuilder } from './scope-items-builder'
import { useToast } from '@/components/shared/toast'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'
import type { ScopeTradeDraft, ContractScopeDropdownItem } from '@/lib/types'

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
  const toast = useToast()
  // TEMP: testing a trade-first input flow — see scope-items-builder.tsx.
  const [buildings, setBuildings] = useState<string[]>([])
  const [trades, setTrades] = useState<ScopeTradeDraft[]>([])

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ScopeForm>({
    defaultValues: { type: 'supplier', notes: '', contractId: '' },
  })
  register('contractId', { required: 'Contract is required' })
  const contractId = watch('contractId')

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-dropdown-scope'],
    queryFn: () => getDropdownContractScope(token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
  const contracts = contractsData ?? []
  const contractsWithScope = contracts.filter((c) => c.has_scope)
  const contractsWithoutScope = contracts.filter((c) => !c.has_scope)

  const createMutation = useMutation({
    mutationFn: (data: ScopeForm) =>
      insertScopeWithItems(token, {
        scope_name: data.scopeName,
        build_contract_id: data.contractId,
        type: scopeTypeToLabel(data.type as 'supplier' | 'subcontractor' | 'both'),
        notes: data.notes,
        items: scopeDraftsToItems(buildings, trades),
      }),
    onSuccess: () => {
      toast(messages.scope.createSuccess, 'success')
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
            <p className="font-medium text-slate-800">Create Scope of Work</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <Field label="Scope Name *" error={errors.scopeName?.message}>
            <input
              {...register('scopeName', { required: 'Scope name is required' })}
              className={inputCls(!!errors.scopeName)}
              placeholder="e.g. Full House Package"
              autoFocus
            />
          </Field>

          <Field label="Contract *" error={errors.contractId?.message}>
            <ContractSearchSelect
              value={contractId}
              onChange={(id) => setValue('contractId', id, { shouldValidate: true })}
              contractsWithScope={contractsWithScope}
              contractsWithoutScope={contractsWithoutScope}
              error={!!errors.contractId}
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

          {createMutation.isError && (
            <p className="text-xs text-red-500 text-center">{messages.scope.createError}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {(isSubmitting || createMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
              Create Scope
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

function ContractSearchSelect({
  value,
  onChange,
  contractsWithScope,
  contractsWithoutScope,
  error,
}: {
  value: string
  onChange: (id: string) => void
  contractsWithScope: ContractScopeDropdownItem[]
  contractsWithoutScope: ContractScopeDropdownItem[]
  error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = [...contractsWithoutScope, ...contractsWithScope].find((c) => c.id === value)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const q = search.trim().toLowerCase()
  const filterFn = (c: ContractScopeDropdownItem) => !q || c.dropdown_label.toLowerCase().includes(q)
  const filteredWithoutScope = contractsWithoutScope.filter(filterFn)
  const filteredWithScope = contractsWithScope.filter(filterFn)
  const noResults = filteredWithoutScope.length === 0 && filteredWithScope.length === 0

  const select = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(inputCls(!!error), 'flex items-center justify-between gap-2 text-left')}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected ? selected.dropdown_label : 'Select contract…'}
        </span>
        <ChevronDown size={14} className={cn('text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contract..."
              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {noResults && (
              <p className="text-xs text-slate-400 text-center py-4">No contracts found</p>
            )}
            {filteredWithoutScope.length > 0 && (
              <ContractOptionGroup label="No Scope Yet" contracts={filteredWithoutScope} value={value} onSelect={select} />
            )}
            {filteredWithScope.length > 0 && (
              <ContractOptionGroup label="Has Scope" contracts={filteredWithScope} value={value} onSelect={select} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ContractOptionGroup({ label, contracts, value, onSelect }: {
  label: string
  contracts: ContractScopeDropdownItem[]
  value: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      {contracts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors truncate',
            c.id === value ? 'text-[#6692C5] font-medium bg-[#6692C5]/5' : 'text-slate-700'
          )}
        >
          {c.dropdown_label}
        </button>
      ))}
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

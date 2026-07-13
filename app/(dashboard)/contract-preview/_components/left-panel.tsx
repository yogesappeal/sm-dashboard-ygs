'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ChevronLeft, MapPin, Wrench, DollarSign, FileText, Users, UserPlus, AlertCircle, Image as ImageIcon, X, Plus, ZoomIn, Info, Handshake, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuthStore } from '@/lib/store'
import { getCrewPaginated, updateProjectCrew } from '@/lib/api'
import type { Contract, Crew, Pod, Scope, PurchaseOrder } from './types'

function PhotoCarousel() {
  const [photos, setPhotos] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!zoomed) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoomed(false)
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed, photos.length])

  function handleFiles(files: FileList | null) {
    if (!files) return
    const readers = Array.from(files).map(file => new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    }))
    Promise.all(readers).then(urls => {
      setPhotos(prev => {
        const next = [...prev, ...urls]
        setCurrent(next.length - 1)
        return next
      })
    })
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      const next = prev.filter((_, i) => i !== idx)
      setCurrent(c => Math.min(c, Math.max(0, next.length - 1)))
      return next
    })
  }

  function prev(e?: React.MouseEvent) { e?.stopPropagation(); setCurrent(c => (c - 1 + photos.length) % photos.length) }
  function next(e?: React.MouseEvent) { e?.stopPropagation(); setCurrent(c => (c + 1) % photos.length) }

  if (photos.length === 0) {
    return (
      <div
        className="relative h-36 bg-slate-100 flex-shrink-0 overflow-hidden cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400 group-hover:text-slate-500 transition-colors">
          <ImageIcon size={24} />
          <p className="text-xs">No photos — click to upload</p>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">0 / 0</div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>
    )
  }

  return (
    <>
      {/* Carousel thumbnail */}
      <div className="relative h-36 bg-black flex-shrink-0 overflow-hidden group">
        <img
          src={photos[current]}
          alt={`Photo ${current + 1}`}
          onClick={() => setZoomed(true)}
          className="w-full h-full object-cover cursor-zoom-in"
        />

        {/* Zoom hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/40 rounded-full p-2">
            <ZoomIn size={18} className="text-white" />
          </div>
        </div>

        {/* Prev / Next */}
        {photos.length > 1 && (
          <>
            <button
              onClick={e => prev(e)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={e => next(e)}
              className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}

        {/* Remove current */}
        <button
          onClick={e => { e.stopPropagation(); removePhoto(current) }}
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X size={11} />
        </button>

        {/* Add more */}
        <button
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <Plus size={11} />
        </button>

        {/* Dot indicators */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setCurrent(i) }}
                className={cn('w-1.5 h-1.5 rounded-full transition-all', i === current ? 'bg-white' : 'bg-white/40')}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
          {current + 1} / {photos.length}
        </div>

        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Lightbox */}
      {zoomed && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          {/* Close */}
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {current + 1} / {photos.length}
          </div>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={e => prev(e)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Image */}
          <img
            src={photos[current]}
            alt={`Photo ${current + 1}`}
            onClick={e => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default"
          />

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={e => next(e)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Dot indicators */}
          {photos.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setCurrent(i) }}
                  className={cn('w-2 h-2 rounded-full transition-all', i === current ? 'bg-white' : 'bg-white/35 hover:bg-white/60')}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

function GoogleDriveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" opacity="0" />
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.05c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 56.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" />
      <path d="M43.65 25 57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2z" />
      <path d="M59.8 52.55h-32.3L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.5c1.6 0 3.15-.45 4.5-1.2z" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 27.55h27.45c0-1.55-.4-3.1-1.2-4.5z" />
    </svg>
  )
}

function AccordionSection({ title, subtitle, defaultOpen = true, headerAction, children }: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 pl-4 pr-2 hover:bg-slate-50 transition-colors">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 min-w-0 py-3 text-left"
        >
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
          {subtitle && (
            <span className="block text-[10px] text-slate-400 normal-case font-normal truncate mt-0.5">{subtitle}</span>
          )}
        </button>
        {headerAction && (
          <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
            {headerAction}
          </div>
        )}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 flex items-center justify-center w-5 h-5"
        >
          {open
            ? <ChevronDown size={13} className="text-slate-400" />
            : <ChevronRight size={13} className="text-slate-400" />
          }
        </button>
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-xs text-slate-700 font-medium leading-snug break-words">{value}</p>
      </div>
    </div>
  )
}

// NOTE: get-crew-paginated's response fields (id/name/role/company) are an
// assumption — adjust CrewMember in lib/api/crew.ts once confirmed.
function CrewAssignPicker({ projectId, currentCrew }: { projectId?: string; currentCrew: Crew[] }) {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['crew-paginated', debouncedSearch],
    queryFn: () => getCrewPaginated(token!, { search: debouncedSearch, limit: 50 }),
    enabled: !!token && open,
  })

  const mutation = useMutation({
    mutationFn: (crewId: string) => updateProjectCrew(token!, { project_id: projectId!, crew_id: crewId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-details-full'] })
      setOpen(false)
      setSearch('')
      setDebouncedSearch('')
    },
  })

  const members = data?.data ?? []

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        disabled={!projectId}
        title={projectId ? 'Add / edit crew' : 'No project selected'}
        className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:text-[#6692C5] hover:bg-[#6692C5]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UserPlus size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-20 w-64 bg-white rounded-xl border border-slate-200 shadow-lg p-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Assign crew</p>
          {currentCrew.length > 0 && (
            <div className="mb-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Currently assigned</p>
              <div className="flex flex-col gap-0.5">
                {Array.from(new Set(currentCrew.map(c => c.crewName || c.name))).map(name => (
                  <p key={name} className="text-xs font-medium text-slate-700 truncate">
                    {name}
                  </p>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            autoFocus
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search crew..."
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
          />
          {mutation.isError && (
            <p className="text-xs text-red-500 mt-2">Failed to assign crew. Try again.</p>
          )}
          <div className="max-h-52 overflow-y-auto mt-2 -mx-1">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            )}
            {!isLoading && members.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No crew found</p>
            )}
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => mutation.mutate(m.id)}
                disabled={mutation.isPending}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-full bg-[#6692C5]/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#6692C5] text-[10px] font-bold">{m.name?.[0]?.toUpperCase() ?? '?'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{m.name}</p>
                  {(m.role || m.company) && (
                    <p className="text-[10px] text-slate-400 truncate">{[m.role, m.company].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function derivePriorities(scopes: Scope[], pos: PurchaseOrder[]) {
  const items: { label: string; sub: string; level: 'high' | 'medium' }[] = []

  pos.filter(p => p.status === 'PO Rejected').forEach(p => {
    items.push({ label: 'Rejected PO — action required', sub: `${p.po_number} · ${p.supplier_name}`, level: 'high' })
  })

  scopes.forEach(scope => {
    scope.scope_details.forEach(b => {
      b.trades.filter(t => t.status === 'Urgent').forEach(t => {
        items.push({ label: `${t.trade_name} — urgent action needed`, sub: `${b.building_name}`, level: 'high' })
      })
    })
  })

  pos.filter(p => p.status === 'PO Draft').forEach(p => {
    items.push({ label: 'Draft PO awaiting review', sub: `${p.po_number} · ${p.supplier_name}`, level: 'medium' })
  })

  return items
}

interface LeftPanelProps {
  contract: Contract
  crew: Crew[]
  pod: Pod
  scopes: Scope[]
  pos: PurchaseOrder[]
  projectId?: string
}

export function LeftPanel({ contract, crew, pod, scopes, pos, projectId }: LeftPanelProps) {
  const [tab, setTab] = useState<'details' | 'documents'>('details')
  const priorities = derivePriorities(scopes, pos)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      <PhotoCarousel />

      {/* Details / Documents tab */}
      <div className="flex border-b border-slate-200 flex-shrink-0">
        {[{ key: 'details', label: 'Details' }, { key: 'documents', label: 'Documents' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'details' | 'documents')}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2',
              tab === t.key
                ? 'border-[#6692C5] text-[#6692C5]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'documents' ? (
          <div className="p-4 flex flex-col gap-4">
            {contract.googleDriveUrl ? (
              <>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <Info size={16} className="text-[#6692C5] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6692C5] font-medium leading-snug">
                    You can view customer folder in Google Drive
                  </p>
                </div>

                <a
                  href={contract.googleDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6692C5] text-white text-sm font-semibold hover:bg-[#5a82b3] transition-colors"
                >
                  <GoogleDriveIcon size={16} />
                  Open Google Drive
                </a>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 text-slate-300">
                <GoogleDriveIcon size={28} />
                <p className="text-sm text-slate-500 font-medium mt-3">No customer folder linked</p>
                <p className="text-xs text-slate-400 mt-1">A Google Drive folder hasn&apos;t been linked to this contract yet</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Client section */}
            <AccordionSection title="Client">
              <InfoRow icon={MapPin} label="Full Name" value={contract.clientFullName} />
              <InfoRow icon={MapPin} label="Address" value={`${contract.streetAddress}, ${contract.suburb} ${contract.state}`} />
              <InfoRow icon={Wrench} label="Ownership" value={contract.builder} />
              <InfoRow icon={DollarSign} label="Contract Value" value={`$${contract.contractValue.toLocaleString()}`} />
              <InfoRow icon={FileText} label="PIF" value={contract.pif} />
              {contract.notes && (
                <InfoRow icon={FileText} label="Notes" value={contract.notes} />
              )}
            </AccordionSection>

            {/* Crew section */}
            <AccordionSection
              title="Crew"
              headerAction={<CrewAssignPicker projectId={projectId} currentCrew={crew} />}
            >
              {crew.length === 0 ? (
                <div className="flex items-center gap-2 py-1 text-slate-400">
                  <Users size={13} />
                  <p className="text-xs">No crew assigned</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {crew.map((member, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-6 h-6 rounded-full bg-[#6692C5]/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#6692C5] text-[10px] font-bold">{member.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 truncate">{member.role}</p>
                        <p className="text-xs font-medium text-slate-700 truncate">{member.name}</p>
                        {member.crewName && (
                          <p className="text-[10px] text-slate-400 truncate">{member.crewName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            {/* POD section */}
            <AccordionSection title="POD">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'SM', name: pod.sm },
                  { label: 'PA', name: pod.pa },
                  { label: 'PM', name: pod.pm },
                  { label: 'AM', name: pod.am },
                ].map((member, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-[#6692C5]/15 flex items-center justify-center flex-shrink-0">
                      <Handshake size={12} className="text-[#6692C5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 truncate">{member.label}</p>
                      <p className="text-xs font-medium text-slate-700 truncate">{member.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Priorities section */}
            <AccordionSection title={`Priorities${priorities.length > 0 ? ` (${priorities.length})` : ''}`}>
              {priorities.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No active priorities — all good!</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {priorities.map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-lg border',
                        p.level === 'high'
                          ? 'bg-red-50 border-red-100'
                          : 'bg-amber-50 border-amber-100'
                      )}
                    >
                      <AlertCircle
                        size={14}
                        className={cn('mt-0.5 flex-shrink-0', p.level === 'high' ? 'text-red-400' : 'text-amber-400')}
                      />
                      <div className="min-w-0">
                        <p className={cn('text-xs font-medium leading-snug', p.level === 'high' ? 'text-red-700' : 'text-amber-700')}>
                          {p.label}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{p.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>
          </>
        )}
      </div>
    </div>
  )
}

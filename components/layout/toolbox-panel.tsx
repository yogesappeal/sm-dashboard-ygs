'use client'

import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Briefcase, Edit, Truck, Shield, Settings, BarChart2, PieChart,
  UserPlus, FolderPlus, Users, Wrench, DollarSign, FileText,
  RefreshCw, Package, LayoutGrid, Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getUserApps } from '@/lib/api'

const ICON_MAP: Record<string, React.ElementType> = {
  briefcase:    Briefcase,
  edit:         Edit,
  truck:        Truck,
  shield:       Shield,
  settings:     Settings,
  'bar-chart':  BarChart2,
  'pie-chart':  PieChart,
  'user-plus':  UserPlus,
  'folder-plus':FolderPlus,
  users:        Users,
  wrench:       Wrench,
  dollar:       DollarSign,
  'file-text':  FileText,
  refresh:      RefreshCw,
  package:      Package,
}

function resolveIcon(name: string): React.ElementType {
  return ICON_MAP[name.toLowerCase()] ?? LayoutGrid
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ToolboxPanel({ open, onClose }: Props) {
  const { token } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['user-apps'],
    queryFn: () => getUserApps(token!),
    enabled: !!token && open,
    staleTime: 10 * 60 * 1000,
  })

  const categories = data?.data ?? []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      <div
        className={`absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60 z-50 overflow-hidden transition-all duration-200 origin-top-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-50">
          <LayoutGrid size={15} className="text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">SM Toolbox</p>
            <p className="text-[10px] text-slate-400 leading-tight">Quick access to support your daily work</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[420px] overflow-y-auto px-4 py-3 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No tools available</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.category}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {cat.category}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {cat.apps.map((app) => {
                    const Icon = resolveIcon(app.icon)
                    return (
                      <a
                        key={app.name}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-slate-100 hover:border-[#6692C5]/30 hover:bg-[#6692C5]/5 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#6692C5]/10 flex items-center justify-center group-hover:bg-[#6692C5]/20 transition-colors">
                          <Icon size={16} className="text-[#6692C5]" />
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium text-center leading-tight line-clamp-2">
                          {app.name}
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

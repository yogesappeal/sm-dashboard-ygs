'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, MapPin, FileText } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { searchContract } from '@/lib/api/contracts'

interface SearchResult {
  id: string
  client_first_name: string
  client_last_name: string
  client_ra_number: string
  state: string
}

export function GlobalSearch() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasResults = results.length > 0
  const showDropdown = focused && (query.trim().length >= 2 || hasResults)

  const doSearch = useCallback(
    async (q: string) => {
      if (!token || q.trim().length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const res = await searchContract(token, q.trim())
        const items: SearchResult[] = Array.isArray(res) ? res : (res as any)?.data ?? []
        setResults(items)
        setActiveIndex(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setActiveIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => doSearch(val), 350)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleSelect = (id: string) => {
    setFocused(false)
    setQuery('')
    setResults([])
    router.push(`/contract/${id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex].id)
    } else if (e.key === 'Escape') {
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Input */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${
          focused
            ? 'border-purple-300 bg-white shadow-sm shadow-purple-100'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        {loading ? (
          <Loader2 size={15} className="text-purple-400 shrink-0 animate-spin" />
        ) : (
          <Search size={15} className={`shrink-0 transition-colors duration-200 ${focused ? 'text-purple-400' : 'text-slate-400'}`} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search projects..."
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
        />
        {query && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="shrink-0 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <div
        className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60 z-50 overflow-hidden transition-all duration-200 origin-top ${
          showDropdown
            ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
        }`}
        style={{ transformOrigin: 'top' }}
      >
        {/* Header row */}
        {query.trim().length >= 2 && (
          <div className="px-4 pt-3 pb-2 border-b border-slate-50">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && query.trim().length >= 2 && (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <FileText size={28} strokeWidth={1.5} />
            <p className="text-sm">No projects found</p>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1.5">
            {results.map((item, idx) => (
              <li key={item.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-100 ${
                    activeIndex === idx ? 'bg-purple-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${activeIndex === idx ? 'bg-purple-100' : 'bg-slate-100'}`}>
                    <FileText size={13} className={activeIndex === idx ? 'text-purple-600' : 'text-slate-500'} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.client_first_name} {item.client_last_name}
                      </p>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 shrink-0">
                        {item.client_ra_number}
                      </span>
                    </div>
                    {item.state && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 truncate">{item.state}</p>
                      </div>
                    )}
                  </div>

                  {/* Enter hint */}
                  <span className={`text-xs text-slate-300 self-center transition-opacity ${activeIndex === idx ? 'opacity-100' : 'opacity-0'}`}>
                    ↵
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-50 flex items-center gap-3">
            <span className="text-[10px] text-slate-400">↑↓ navigate</span>
            <span className="text-[10px] text-slate-400">↵ open</span>
            <span className="text-[10px] text-slate-400">esc close</span>
          </div>
        )}
      </div>
    </div>
  )
}

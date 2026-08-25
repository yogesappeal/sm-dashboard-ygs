'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store'
import { User, Mail, Phone, Briefcase, Hash, X, ZoomIn } from 'lucide-react'

const STORAGE_BASE = 'https://exlknzxmmqnehvximbyj.supabase.co'

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[#6692C5]/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} className="text-[#6692C5]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )
}

function ImagePreviewModal({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X size={15} />
        </button>

        {/* Image */}
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20">
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover"
            sizes="384px"
          />
        </div>

        {/* Name tag */}
        <div className="mt-3 text-center">
          <p className="text-white font-semibold text-sm drop-shadow">{name}</p>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, role } = useAuthStore()
  const [preview, setPreview] = useState(false)

  const avatarUrl = user?.image_url
    ? user.image_url.startsWith('http')
      ? user.image_url
      : `${STORAGE_BASE}/${user.image_url.replace(/^\/+/, '')}`
    : null

  const initials = user?.first_name?.[0]?.toUpperCase() ?? '?'
  const displayName = user?.full_name || `${user?.first_name} ${user?.last_name}`

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your account information</p>
        </div>

        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-5">
          {avatarUrl ? (
            <button
              onClick={() => setPreview(true)}
              className="relative w-20 h-20 shrink-0 group focus:outline-none"
              aria-label="Preview photo"
            >
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                sizes="80px"
                className="rounded-2xl object-cover ring-4 ring-[#6692C5]/10 transition-all duration-200 group-hover:ring-[#6692C5]/30 group-hover:brightness-90"
              />
              {/* Zoom hint overlay */}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
              </div>
            </button>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#6692C5]/10 border border-[#6692C5]/20 flex items-center justify-center shrink-0">
              <span className="text-[#6692C5] text-2xl font-bold">{initials}</span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800">{displayName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{user?.job_title || role || 'Site Manager'}</p>
            <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[#6692C5]/10 text-[#6692C5] border border-[#6692C5]/20">
              {role || 'Site Manager'}
            </span>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl border border-slate-100 px-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-5 pb-2">
            Personal Information
          </h3>
          <Field icon={User}      label="Full Name"    value={user?.full_name} />
          <Field icon={Mail}      label="Email"        value={user?.email} />
          <Field icon={Phone}     label="Mobile Phone" value={user?.mobile_phone} />
          <Field icon={Briefcase} label="Job Title"    value={user?.job_title} />
          <Field icon={Hash}      label="Reference ID" value={user?.reference_id} />
        </div>
      </div>

      {/* Lightbox */}
      {preview && avatarUrl && (
        <ImagePreviewModal
          src={avatarUrl}
          name={displayName}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  )
}

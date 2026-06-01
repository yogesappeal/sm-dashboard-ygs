'use client'

import { useState } from 'react'
import { Bell, Moon, Globe, Shield, ChevronRight } from 'lucide-react'

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-[#C66EEB]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingRow({
  icon: Icon,
  label,
  description,
  action,
}: {
  icon: React.ElementType
  label: string
  description?: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-[#C66EEB]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your preferences</p>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-100 px-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-5 pb-2">
          Notifications
        </h3>
        <SettingRow
          icon={Bell}
          label="Push Notifications"
          description="Receive in-app alerts for updates"
          action={<Toggle enabled={notifications} onChange={setNotifications} />}
        />
        <SettingRow
          icon={Bell}
          label="Email Alerts"
          description="Get notified via email for important events"
          action={<Toggle enabled={emailAlerts} onChange={setEmailAlerts} />}
        />
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-2xl border border-slate-100 px-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-5 pb-2">
          Appearance
        </h3>
        <SettingRow
          icon={Moon}
          label="Dark Mode"
          description="Switch to dark theme (coming soon)"
          action={<Toggle enabled={darkMode} onChange={setDarkMode} />}
        />
        <SettingRow
          icon={Globe}
          label="Language"
          description="English (Australia)"
          action={
            <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Change <ChevronRight size={14} />
            </button>
          }
        />
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-slate-100 px-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-5 pb-2">
          Security
        </h3>
        <SettingRow
          icon={Shield}
          label="Change Password"
          description="Update your account password"
          action={
            <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Update <ChevronRight size={14} />
            </button>
          }
        />
      </div>
    </div>
  )
}

import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10">
      <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
      <p className="text-slate-400 text-sm mb-8">Sign in to your account</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}

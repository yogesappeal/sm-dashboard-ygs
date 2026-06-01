import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h1>
      <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}

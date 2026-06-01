'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <p className="text-slate-700 font-medium text-sm mb-1">Something went wrong</p>
          {this.state.message && (
            <p className="text-slate-400 text-xs mb-4 max-w-xs">{this.state.message}</p>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#C66EEB] border border-[#C66EEB]/30 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface ErrorBoundaryProps {
  children: ReactNode
  resetKey?: string | number
}

interface ErrorBoundaryState {
  hasError: boolean
}

function ErrorFallbackUI({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 bg-[var(--color-bg)] text-center"
    >
      <div className="max-w-sm w-full bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col items-center gap-4 shadow-lg">
        <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-text-primary">
            {t('errorBoundary.title', { defaultValue: 'Bir şeyler ters gitti' })}
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t('errorBoundary.desc', { defaultValue: 'Sayfa yüklenirken beklenmeyen bir hata oluştu.' })}
          </p>
        </div>
        <div className="flex flex-col w-full gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
          >
            {t('errorBoundary.reload', { defaultValue: 'Sayfayı Yenile' })}
          </button>
          <button
            type="button"
            onClick={() => {
              onReset()
              window.location.assign('/')
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-muted text-text-primary text-sm font-medium transition-colors"
          >
            {t('errorBoundary.home', { defaultValue: 'Ana Sayfaya Dön' })}
          </button>
        </div>
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI onReset={this.handleReset} />
    }
    return this.props.children
  }
}

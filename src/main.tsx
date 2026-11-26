import React, { Suspense } from 'react'
import './i18n'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import 'leaflet/dist/leaflet.css'
import './index.css'
import { setupAppUpdateChecks } from '@/utils/appUpdate'
import { applyTheme, getInitialTheme } from '@/hooks/useTheme'
import ErrorBoundary from '@/components/ErrorBoundary'
import { tryGuardedChunkReload } from '@/utils/lazyWithRetry'

// Must run synchronously BEFORE React renders — prevents flash of wrong theme
applyTheme(getInitialTheme())

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  tryGuardedChunkReload()
})

// When the service worker updates and takes control, reload so the new
// assets are served instead of the old cached bundle.
// Guard prevents reloading on first visit (no prior controller) or rapid reloads.
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  const swUrl = `${import.meta.env.BASE_URL}sw.js`
  void navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' }).catch(() => {
    // Ignore registration failures; app still works without offline support.
  })

  let hasReloadedForSWUpdate = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || hasReloadedForSWUpdate) return
    hasReloadedForSWUpdate = true
    window.location.reload()
  })
}

setupAppUpdateChecks()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 10_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{ color: '#94a3b8', padding: 32, textAlign: 'center' }}>…</div>
      }>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
)

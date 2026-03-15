import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setupAppUpdateChecks } from '@/utils/appUpdate'

// When the service worker updates and takes control, reload so the new
// assets are served instead of the old cached bundle.
// Guard prevents multiple rapid reloads if controllerchange fires more than once.
if ('serviceWorker' in navigator) {
  const swUrl = `${import.meta.env.BASE_URL}sw.js`
  void navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' }).catch(() => {
    // Ignore registration failures; app still works without offline support.
  })

  let hasReloadedForSWUpdate = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloadedForSWUpdate) return
    hasReloadedForSWUpdate = true
    window.location.reload()
  })
}

setupAppUpdateChecks()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

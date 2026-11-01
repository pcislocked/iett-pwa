import pkg from '../../package.json'

const VERSION_ENDPOINT = `${import.meta.env.BASE_URL}version.json`
const VERSION_CHECK_INTERVAL_MS = 60_000
const VERSION_RELOAD_FLAG_KEY = 'iett:update-reloaded-version'
const VERSION_RELOAD_TIMESTAMP_KEY = 'iett:update-reloaded-timestamp'
const MIN_RELOAD_INTERVAL_MS = 60_000
const VERSION_CHECK_FAILURE_BASE_DELAY_MS = 15_000
const VERSION_CHECK_FAILURE_MAX_DELAY_MS = 5 * 60_000

type VersionManifest = {
  version?: string
}

async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const url = `${VERSION_ENDPOINT}?t=${Date.now()}`
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    })
    if (!response.ok) return null

    const manifest = (await response.json()) as VersionManifest
    return typeof manifest.version === 'string' ? manifest.version : null
  } catch {
    return null
  }
}

export async function clearOriginCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => !key.startsWith('workbox-precache'))
        .map((key) => caches.delete(key)),
    )
  } catch {
    // Ignore cache API failures and still attempt reload.
  }
}

export function cleanupReloadQueryParams(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('v') || url.searchParams.has('reload')) {
      url.searchParams.delete('v')
      url.searchParams.delete('reload')
      const clean = url.pathname + (url.search ? url.search : '') + url.hash
      window.history.replaceState(window.history.state, '', clean)
    }
  } catch {
    // Ignore URL parsing errors
  }
}

async function refreshServiceWorkers(options?: { activateWaiting?: boolean }): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const activateWaiting = options?.activateWaiting === true
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.update()
        } catch {
          // Ignore single registration update failure.
        }

        if (activateWaiting) {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
          registration.installing?.postMessage({ type: 'SKIP_WAITING' })
        }
      }),
    )
  } catch {
    // Ignore service worker API failures and still attempt reload.
  }
}

async function forceReloadForNewVersion(nextVersion: string): Promise<void> {
  const now = Date.now()
  try {
    const lastVersion = localStorage.getItem(VERSION_RELOAD_FLAG_KEY)
    const lastTime = Number(localStorage.getItem(VERSION_RELOAD_TIMESTAMP_KEY)) || 0

    // Prevent loop: do not reload if already reloaded for this version within cooldown window
    if (lastVersion === nextVersion && now - lastTime < MIN_RELOAD_INTERVAL_MS) {
      return
    }

    localStorage.setItem(VERSION_RELOAD_FLAG_KEY, nextVersion)
    localStorage.setItem(VERSION_RELOAD_TIMESTAMP_KEY, String(now))
  } catch {
    const reloadedVersion = sessionStorage.getItem(VERSION_RELOAD_FLAG_KEY)
    if (reloadedVersion === nextVersion) return
    sessionStorage.setItem(VERSION_RELOAD_FLAG_KEY, nextVersion)
  }

  await clearOriginCaches()
  await refreshServiceWorkers({ activateWaiting: true })

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('v', nextVersion)
  nextUrl.searchParams.set('reload', String(now))
  window.location.replace(nextUrl.toString())
}

/**
 * Keeps the running app aligned with the latest deployed build.
 * If a newer version is detected, stale SW/cache entries are cleared and
 * the page is force-reloaded with a cache-busting URL.
 */
export function setupAppUpdateChecks(): void {
  cleanupReloadQueryParams()
  const currentVersion = __APP_VERSION__
  let checking = false
  let consecutiveFailures = 0
  let nextAllowedCheckAt = 0

  const checkForUpdate = async () => {
    if (checking) return
    if (Date.now() < nextAllowedCheckAt) return
    checking = true
    try {
      // Force a SW update check first, then compare deployed manifest version.
      await refreshServiceWorkers()
      const deployedVersion = await fetchDeployedVersion()
      if (!deployedVersion) {
        consecutiveFailures += 1
        const delay = Math.min(
          VERSION_CHECK_FAILURE_MAX_DELAY_MS,
          VERSION_CHECK_FAILURE_BASE_DELAY_MS * consecutiveFailures,
        )
        nextAllowedCheckAt = Date.now() + delay
        return
      }

      consecutiveFailures = 0
      nextAllowedCheckAt = 0
      if (deployedVersion === currentVersion) return
      await forceReloadForNewVersion(deployedVersion)
    } finally {
      checking = false
    }
  }

  void checkForUpdate()

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate()
    }
  }

  const onPageShow = () => {
    void checkForUpdate()
  }

  window.addEventListener('focus', onVisible)
  window.addEventListener('pageshow', onPageShow)
  document.addEventListener('visibilitychange', onVisible)
  window.setInterval(() => {
    if (document.visibilityState === 'hidden') return
    void checkForUpdate()
  }, VERSION_CHECK_INTERVAL_MS)
}


export function getCurrentAppVersion(): string {
  if (typeof __APP_VERSION__ !== 'undefined') {
    return __APP_VERSION__
  }
  return pkg.version || '0.4.12'
}

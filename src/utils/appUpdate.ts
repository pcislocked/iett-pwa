const VERSION_ENDPOINT = '/version.json'
const VERSION_CHECK_INTERVAL_MS = 60_000
const VERSION_RELOAD_FLAG_KEY = 'iett:update-reloaded-version'

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

async function clearOriginCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  } catch {
    // Ignore cache API failures and still attempt reload.
  }
}

async function refreshServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.update()
        } catch {
          // Ignore single registration update failure.
        }

        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        registration.installing?.postMessage({ type: 'SKIP_WAITING' })
      }),
    )
  } catch {
    // Ignore service worker API failures and still attempt reload.
  }
}

async function forceReloadForNewVersion(nextVersion: string): Promise<void> {
  const reloadedVersion = sessionStorage.getItem(VERSION_RELOAD_FLAG_KEY)
  if (reloadedVersion === nextVersion) return

  sessionStorage.setItem(VERSION_RELOAD_FLAG_KEY, nextVersion)

  await refreshServiceWorkers()
  await clearOriginCaches()

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('v', nextVersion)
  nextUrl.searchParams.set('reload', String(Date.now()))
  window.location.replace(nextUrl.toString())
}

/**
 * Keeps the running app aligned with the latest deployed build.
 * If a newer version is detected, stale SW/cache entries are cleared and
 * the page is force-reloaded with a cache-busting URL.
 */
export function setupAppUpdateChecks(): void {
  const currentVersion = __APP_VERSION__
  let checking = false

  const checkForUpdate = async () => {
    if (checking) return
    checking = true
    try {
      const deployedVersion = await fetchDeployedVersion()
      if (!deployedVersion || deployedVersion === currentVersion) return
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

  window.addEventListener('focus', onVisible)
  document.addEventListener('visibilitychange', onVisible)
  window.setInterval(() => {
    void checkForUpdate()
  }, VERSION_CHECK_INTERVAL_MS)
}

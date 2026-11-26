import { lazy, type ComponentType } from 'react'

export const CHUNK_RELOAD_KEY = 'iett:chunk-reload-attempted'

export function tryGuardedChunkReload(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      return false
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function clearChunkReloadFlag(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    // Ignore storage access failures
  }
}

export function lazyWithRetry<P extends object = Record<string, never>>(
  importer: () => Promise<{ default: ComponentType<P> }>,
) {
  return lazy(async () => {
    try {
      const mod = await importer()
      clearChunkReloadFlag()
      return mod
    } catch (err) {
      if (tryGuardedChunkReload()) {
        return await new Promise<{ default: ComponentType<P> }>(() => {})
      }
      throw err
    }
  })
}

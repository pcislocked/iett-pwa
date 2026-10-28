import { useState, useEffect, useCallback } from 'react'
import { getCurrentAppVersion } from '../utils/appUpdate'

export const LAST_SEEN_VERSION_KEY = 'iett:last-seen-version'

export interface VersionTransition {
  oldVersion: string
  newVersion: string
}

/**
 * Normalizes version strings by stripping a leading 'v' or 'V' and trimming whitespace.
 */
export function normalizeVersion(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/^[vV]/, '')
}

/**
 * Safely reads the stored version from localStorage.
 * Returns { ok: false, value: null } if storage throws an exception.
 */
export function readStoredVersionSafe(): { ok: boolean; value: string | null } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: false, value: null }
    }
    const raw = window.localStorage.getItem(LAST_SEEN_VERSION_KEY)
    const cleaned = normalizeVersion(raw)
    return { ok: true, value: cleaned.length > 0 ? cleaned : null }
  } catch {
    return { ok: false, value: null }
  }
}

/**
 * Safely writes the given version to localStorage.
 * Returns true if persisted, false if storage threw an error.
 */
export function writeStoredVersionSafe(version: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }
    const cleaned = normalizeVersion(version)
    if (!cleaned) return false
    window.localStorage.setItem(LAST_SEEN_VERSION_KEY, cleaned)
    return true
  } catch {
    return false
  }
}

/**
 * Ensures current version is stored in localStorage if not already present.
 * Never throws; safe to call from SettingsPage or App initialization.
 */
export function ensureCurrentVersionStored(): void {
  const current = normalizeVersion(getCurrentAppVersion())
  if (!current) return
  const { ok, value } = readStoredVersionSafe()
  if (ok && value === null) {
    writeStoredVersionSafe(current)
  }
}

export function useVersionBanner(showUpdateBannerPref: boolean) {
  const [transition, setTransition] = useState<VersionTransition | null>(null)

  useEffect(() => {
    const currentVersion = normalizeVersion(getCurrentAppVersion())
    if (!currentVersion || currentVersion === '0.0.0') {
      return
    }

    const { ok, value: storedVersion } = readStoredVersionSafe()

    // 1) If localStorage is inaccessible/throws -> never show banner
    if (!ok) {
      setTransition(null)
      return
    }

    // 2) First visit (no version stored yet) -> store current version silently & do NOT show banner
    if (storedVersion === null) {
      writeStoredVersionSafe(currentVersion)
      setTransition(null)
      return
    }

    // 3) Version changed (vOLD !== vNEW)
    if (storedVersion !== currentVersion) {
      if (!showUpdateBannerPref) {
        // User disabled update banners in settings: silently advance stored version
        writeStoredVersionSafe(currentVersion)
        setTransition(null)
        return
      }
      setTransition({
        oldVersion: storedVersion,
        newVersion: currentVersion,
      })
    } else {
      setTransition(null)
    }
  }, [showUpdateBannerPref])

  const dismissBanner = useCallback(() => {
    const currentVersion = normalizeVersion(getCurrentAppVersion())
    if (currentVersion) {
      writeStoredVersionSafe(currentVersion)
    }
    setTransition(null)
  }, [])

  return {
    transition,
    isVisible: Boolean(transition && showUpdateBannerPref),
    dismissBanner,
  }
}

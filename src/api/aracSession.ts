import type { AracSessionCredentials } from '@/api/client'

const STORAGE_PREFIX = 'arac-session-'

export interface StoredAracSession extends AracSessionCredentials {
  savedAt: string
}

function getKey(kapino?: string): string {
  return kapino ? `${STORAGE_PREFIX}${kapino}` : `${STORAGE_PREFIX}global`
}

export function loadAracSession(kapino?: string): StoredAracSession | null {
  try {
    const raw = sessionStorage.getItem(getKey(kapino))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredAracSession>
    if (!parsed || typeof parsed.sessionId !== 'string' || typeof parsed.sessionKey !== 'string') {
      return null
    }
    return {
      sessionId: parsed.sessionId,
      sessionKey: parsed.sessionKey,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveAracSession(session: AracSessionCredentials, kapino?: string): StoredAracSession {
  const stored: StoredAracSession = {
    ...session,
    savedAt: new Date().toISOString(),
  }
  try {
    const key = getKey(kapino || session.sessionId)
    sessionStorage.setItem(key, JSON.stringify(stored))
  } catch {
    // Storage failures should not crash aracapi flow.
  }
  return stored
}

export function clearAracSession(kapino?: string): void {
  try {
    if (kapino) {
      sessionStorage.removeItem(getKey(kapino))
    } else {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(STORAGE_PREFIX)) {
          sessionStorage.removeItem(k)
        }
      })
    }
  } catch {
    // Storage failures should not crash aracapi flow.
  }
}

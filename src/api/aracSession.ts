import type { AracSessionCredentials } from '@/api/client'

const STORAGE_KEY = 'arac-session-v1'

export interface StoredAracSession extends AracSessionCredentials {
  savedAt: string
}

export function loadAracSession(): StoredAracSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
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

export function saveAracSession(session: AracSessionCredentials): StoredAracSession {
  const stored: StoredAracSession = {
    ...session,
    savedAt: new Date().toISOString(),
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage failures should not crash ARAC flow.
  }
  return stored
}

export function clearAracSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage failures should not crash ARAC flow.
  }
}

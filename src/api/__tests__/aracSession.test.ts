import { afterEach, describe, expect, it } from 'vitest'

import { clearAracSession, loadAracSession, saveAracSession } from '@/api/aracSession'

afterEach(() => {
  sessionStorage.clear()
})

describe('aracSession storage helpers', () => {
  it('saves and loads ARAC session from sessionStorage', () => {
    saveAracSession({ sessionId: 'sid-1', sessionKey: 'key-1' })
    const loaded = loadAracSession()

    expect(loaded).not.toBeNull()
    expect(loaded?.sessionId).toBe('sid-1')
    expect(loaded?.sessionKey).toBe('key-1')
    expect(typeof loaded?.savedAt).toBe('string')
  })

  it('returns null on malformed storage value', () => {
    sessionStorage.setItem('arac-session-v1', '{broken-json')
    expect(loadAracSession()).toBeNull()
  })

  it('clears persisted session', () => {
    saveAracSession({ sessionId: 'sid-2', sessionKey: 'key-2' })
    clearAracSession()
    expect(loadAracSession()).toBeNull()
  })
})

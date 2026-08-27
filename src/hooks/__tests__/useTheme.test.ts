import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, applyTheme, getInitialTheme } from '../useTheme'

describe('useTheme hook', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('initializes with default dark theme or stored theme', () => {
    localStorage.setItem('iett-pwa-theme', 'amoled')
    expect(getInitialTheme()).toBe('amoled')

    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('amoled')
  })

  it('applies and switches themes reactively', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('iett-pwa-theme')).toBe('light')

    act(() => {
      applyTheme('amoled')
    })

    expect(result.current.theme).toBe('amoled')
    expect(document.documentElement.getAttribute('data-theme')).toBe('amoled')
  })

  it('syncs theme across windows on storage event', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'iett-pwa-theme',
        newValue: 'light',
      })
      window.dispatchEvent(storageEvent)
    })

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, applyTheme, getInitialTheme } from '../useTheme'

describe('useTheme hook', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('initializes with default amoled theme or stored theme', () => {
    expect(getInitialTheme()).toBe('amoled')

    localStorage.setItem('iett-pwa-theme', 'dark')
    expect(getInitialTheme()).toBe('dark')

    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('applies and switches themes reactively', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('iett-pwa-theme')).toBe('light')

    act(() => {
      applyTheme('amoled')
    })

    expect(result.current.theme).toBe('amoled')
    expect(document.documentElement.getAttribute('data-theme')).toBe('amoled')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
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

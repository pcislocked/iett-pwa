import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { BottomBarContext, useBottomBar, useBottomBarState, type BottomBarTab } from '../useBottomBar'

describe('useBottomBar hook', () => {
  it('updates and resets custom tabs correctly via provider state', () => {
    const { result } = renderHook(() => useBottomBarState())

    expect(result.current.customTabs).toBeNull()

    const mockTabs: BottomBarTab[] = [
      { label: 'Tab 1', icon: <span>1</span>, onPress: vi.fn() },
    ]

    act(() => {
      result.current.setCustomTabs(mockTabs)
    })

    expect(result.current.customTabs).toEqual(mockTabs)

    act(() => {
      result.current.setCustomTabs(null)
    })

    expect(result.current.customTabs).toBeNull()
  })

  it('sets and unmounts custom tabs inside component wrapper', () => {
    const setCustomTabs = vi.fn()
    const mockTabs: BottomBarTab[] = [
      { label: 'Custom', icon: <span>C</span>, onPress: vi.fn() },
    ]

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BottomBarContext.Provider value={{ customTabs: null, setCustomTabs }}>
        {children}
      </BottomBarContext.Provider>
    )

    const { unmount } = renderHook(() => useBottomBar(mockTabs), { wrapper })

    expect(setCustomTabs).toHaveBeenCalledWith(mockTabs)

    unmount()
    expect(setCustomTabs).toHaveBeenCalledWith(null)
  })
})

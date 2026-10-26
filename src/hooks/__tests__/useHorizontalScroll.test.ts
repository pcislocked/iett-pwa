import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useHorizontalScroll } from '../useHorizontalScroll'

describe('useHorizontalScroll', () => {
  it('translates vertical wheel events to horizontal scroll', () => {
    const { result } = renderHook(() => useHorizontalScroll<HTMLDivElement>())
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 1000, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
    el.scrollLeft = 0

    // attach ref
    ;(result.current as { current: HTMLDivElement | null }).current = el

    // re-trigger effect by rerendering with element attached
    const { unmount } = renderHook(() => {
      const ref = useHorizontalScroll<HTMLDivElement>()
      ;(ref as { current: HTMLDivElement | null }).current = el
      return ref
    })

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 50,
      deltaX: 0,
      cancelable: true,
    })
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault')

    el.dispatchEvent(wheelEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(el.scrollLeft).toBe(50)

    unmount()
  })

  it('handles mouse drag and suppresses click when dragged', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollWidth', { value: 1000, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(el, 'offsetLeft', { value: 0, configurable: true })
    el.scrollLeft = 100

    const { unmount } = renderHook(() => {
      const ref = useHorizontalScroll<HTMLDivElement>()
      ;(ref as { current: HTMLDivElement | null }).current = el
      return ref
    })

    // mouse down
    el.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 200 }))

    // mouse move dragging leftwards
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }))
    expect(el.classList.contains('cursor-grabbing')).toBe(true)
    expect(el.classList.contains('select-none')).toBe(true)

    // mouse up
    window.dispatchEvent(new MouseEvent('mouseup'))
    expect(el.classList.contains('cursor-grabbing')).toBe(false)

    // click event should be prevented because drag distance was > 5
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault')
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

    el.dispatchEvent(clickEvent)
    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(stopPropagationSpy).toHaveBeenCalled()

    // subsequent click without dragging should NOT be prevented
    const clickEvent2 = new MouseEvent('click', { bubbles: true, cancelable: true })
    const preventDefaultSpy2 = vi.spyOn(clickEvent2, 'preventDefault')
    el.dispatchEvent(clickEvent2)
    expect(preventDefaultSpy2).not.toHaveBeenCalled()

    unmount()
  })
})

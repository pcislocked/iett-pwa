import { useEffect, useMemo, type MutableRefObject } from 'react'

const activeScrollCleanups = new WeakMap<HTMLElement, () => void>()

function attachHorizontalScrollListeners<T extends HTMLElement>(el: T): () => void {
  activeScrollCleanups.get(el)?.()

  let isDown = false
  let startX = 0
  let scrollLeft = 0
  let dragDistance = 0

  function onWheel(e: WheelEvent) {
    if (el.scrollWidth <= el.clientWidth) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    isDown = true
    dragDistance = 0
    startX = e.pageX - el.offsetLeft
    scrollLeft = el.scrollLeft
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - startX) * 1.4
    dragDistance = Math.abs(walk)
    el.scrollLeft = scrollLeft - walk

    if (dragDistance > 5) {
      el.classList.add('cursor-grabbing', 'select-none')
    }
  }

  function onMouseUp() {
    if (!isDown) return
    isDown = false
    el.classList.remove('cursor-grabbing', 'select-none')
  }

  function onMouseLeave() {
    if (!isDown) return
    isDown = false
    el.classList.remove('cursor-grabbing', 'select-none')
  }

  function onClickCapture(e: MouseEvent) {
    if (dragDistance > 5) {
      e.stopPropagation()
      e.preventDefault()
      dragDistance = 0
    }
  }

  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  el.addEventListener('mouseleave', onMouseLeave)
  el.addEventListener('click', onClickCapture, true)

  const cleanup = () => {
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    el.removeEventListener('mouseleave', onMouseLeave)
    el.removeEventListener('click', onClickCapture, true)
    el.classList.remove('cursor-grabbing', 'select-none')
    if (activeScrollCleanups.get(el) === cleanup) {
      activeScrollCleanups.delete(el)
    }
  }
  activeScrollCleanups.set(el, cleanup)
  return cleanup
}

/**
 * useHorizontalScroll
 *
 * Enables horizontal scrolling via mouse wheel and click-and-drag for containers
 * with overflow-x-auto.
 *
 * Supports dynamically/conditionally mounted elements by attaching listeners
 * whenever React (or tests) assigns `ref.current`.
 */
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(): MutableRefObject<T | null> {
  const ref = useMemo<MutableRefObject<T | null>>(() => {
    let currentEl: T | null = null
    let cleanup: (() => void) | null = null

    return {
      get current() {
        return currentEl
      },
      set current(nextEl: T | null) {
        if (currentEl === nextEl) return
        cleanup?.()
        cleanup = null
        currentEl = nextEl
        if (nextEl) {
          cleanup = attachHorizontalScrollListeners(nextEl)
        }
      },
    }
  }, [])

  useEffect(() => {
    return () => {
      ref.current = null
    }
  }, [ref])

  return ref
}

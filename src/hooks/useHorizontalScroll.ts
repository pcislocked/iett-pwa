import { useEffect, useRef } from 'react'

/**
 * useHorizontalScroll
 *
 * Enables horizontal scrolling via mouse wheel and click-and-drag for containers
 * with overflow-x-auto.
 *
 * Features:
 * - Non-passive wheel listener translates vertical wheel deltas into horizontal scroll.
 * - Left-click drag to scroll horizontally.
 * - Suppresses accidental clicks on child elements (e.g. route filter buttons) after dragging.
 */
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let isDown = false
    let startX = 0
    let scrollLeft = 0
    let dragDistance = 0

    function onWheel(e: WheelEvent) {
      if (!el || el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0 || !el) return
      isDown = true
      dragDistance = 0
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDown || !el) return
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
      if (el) {
        el.classList.remove('cursor-grabbing', 'select-none')
      }
    }

    function onMouseLeave() {
      if (!isDown) return
      isDown = false
      if (el) {
        el.classList.remove('cursor-grabbing', 'select-none')
      }
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

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('click', onClickCapture, true)
      el.classList.remove('cursor-grabbing', 'select-none')
    }
  }, [])

  return ref
}

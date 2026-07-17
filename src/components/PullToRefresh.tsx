import { useState, useRef, useEffect, ReactNode } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  onScroll?: React.UIEventHandler<HTMLDivElement>
  innerRef?: React.RefObject<HTMLDivElement | null>
}

export default function PullToRefresh({ onRefresh, children, onScroll, innerRef }: PullToRefreshProps) {
  const defaultRef = useRef<HTMLDivElement>(null)
  const containerRef = innerRef || defaultRef
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)
  const maxPull = 120
  const threshold = 60

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      // Only pull if we are at the very top of the scroll container
      if (el.scrollTop > 0) return
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return
      currentY.current = e.touches[0].clientY
      const dy = currentY.current - startY.current
      if (dy > 0 && el.scrollTop <= 0) {
        // Prevent default scroll behavior
        if (e.cancelable) e.preventDefault()
        // Dampen the pull
        const pull = Math.min(dy * 0.5, maxPull)
        setPullDistance(pull)
      }
    }

    const onTouchEnd = async () => {
      if (!isPulling.current) return
      isPulling.current = false
      
      if (pullDistance > threshold && !refreshing) {
        setRefreshing(true)
        setPullDistance(50) // hold at 50px
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance, refreshing, onRefresh, containerRef])

  return (
    <div 
      ref={containerRef} 
      onScroll={onScroll}
      className="flex-1 overflow-y-auto overscroll-none relative"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div 
        className="absolute top-0 left-0 w-full flex justify-center items-center pointer-events-none transition-transform duration-200 z-50"
        style={{ 
          height: '60px', 
          transform: `translateY(${pullDistance > 0 ? pullDistance - 60 : -60}px)`,
          opacity: pullDistance / threshold
        }}
      >
        {refreshing ? (
          <div className="bg-surface-card shadow-lg rounded-full p-2 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--wp-accent)] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          </div>
        ) : (
          <div 
            className="bg-surface-card shadow-lg rounded-full p-2 flex items-center justify-center transition-transform"
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          >
            <svg 
              className="w-5 h-5 text-text-muted" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
      </div>
      
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {children}
      </div>
    </div>
  )
}

import { useRef } from 'react'

interface SwipeableTabsProps {
  /** Zero-based active page index */
  index: number
  onIndexChange: (i: number) => void
  /** Disable horizontal drag (e.g. when a map tab is active) */
  disabled?: boolean
  children: React.ReactNode[]
}

/**
 * Horizontally swipeable page container.
 * Uses CSS translate for smooth rendering — no JS animation loop.
 * `touch-action: pan-y` preserves vertical scroll inside each page.
 */
export default function SwipeableTabs({
  index,
  onIndexChange,
  disabled,
  children,
}: SwipeableTabsProps) {
  const startX = useRef<number | null>(null)
  const count = children.length

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return
    startX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (disabled || startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    startX.current = null
    if (Math.abs(dx) < 50) return          // below threshold — ignore
    if (dx < 0 && index < count - 1) onIndexChange(index + 1)
    if (dx > 0 && index > 0) onIndexChange(index - 1)
  }

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(-${(index / count) * 100}%)`,
          transition: 'transform 0.22s ease-out',
        }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            style={{ width: `${100 / count}%` }}
            className="flex-shrink-0 h-full overflow-y-auto"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}

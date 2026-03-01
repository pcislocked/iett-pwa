import { useLocation, useNavigate } from 'react-router-dom'
import { MAIN_PATHS } from '@/routes'

const LABELS: Record<string, string> = {
  '/search': 'ara',
  '/':       'ana',
  '/nearby': 'yakın',
}

/**
 * Windows Phone 8 "Pivot" header.
 *
 * Renders all tab labels in a single overflow-hidden flex row so the right-most
 * labels naturally bleed off the edge — the classic WP8 "more content here" cue.
 * Active tab is pure white; inactive tabs fade into the background (#404040).
 */
export default function PivotHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentIdx = (MAIN_PATHS as readonly string[]).indexOf(location.pathname)

  // Only render on main swipeable tabs
  if (currentIdx === -1) return null

  return (
    <div className="flex-none overflow-hidden safe-area-pt">
      <div className="flex items-baseline pl-4 pt-1 gap-5">
        {(MAIN_PATHS as readonly string[]).map((path) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="metro-tilt shrink-0"
            >
              <span
                className="leading-none lowercase tracking-[-0.02em] font-light select-none"
                style={{
                  fontSize: '2.75rem',
                  color: active ? '#ffffff' : '#404040',
                }}
              >
                {LABELS[path]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

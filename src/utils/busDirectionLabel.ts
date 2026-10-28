import type { RouteMetadata, RouteStop } from '@/api/client'

export interface BusDirectionInput {
  direction?: string | null
  direction_letter?: string | null
  route_name?: string | null
  first_stop?: string | null
  metadata?: RouteMetadata[] | null
  route_stops?: RouteStop[] | null
}

function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR')
}

function isRingText(text: string): boolean {
  const upper = norm(text)
  return /\b(RİNG|RING)\b/.test(upper)
}

function splitDashEndpoints(name: string): [string, string] | null {
  const parts = name.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return [parts[0], parts.slice(1).join(' - ')]
  }
  return null
}

/**
 * Formats the bus signboard title for MapPage and MapBusPicker.
 * Never produces a broken single-ended "→ TERMINAL" string when route metadata is available.
 */
export function formatBusDirectionLabel(input: BusDirectionInput, fallbackText: string): string {
  const { direction, direction_letter, route_name, first_stop, metadata, route_stops } = input

  // 1. Pick primary G (0) and D (1) metadata variants (prefer depar_no === 0)
  const gMeta =
    metadata?.find(m => m.direction === 0 && m.depar_no === 0) ??
    metadata?.find(m => m.direction === 0)
  const dMeta =
    metadata?.find(m => m.direction === 1 && m.depar_no === 0) ??
    metadata?.find(m => m.direction === 1)
  const primaryMeta = gMeta ?? dMeta ?? metadata?.[0]

  // Check Ring from metadata
  if (primaryMeta?.direction_name) {
    if (isRingText(primaryMeta.direction_name) || isRingText(primaryMeta.full_name || '')) {
      return primaryMeta.direction_name.trim()
    }
    const endpoints = splitDashEndpoints(primaryMeta.direction_name)
    if (endpoints && norm(endpoints[0]) === norm(endpoints[1])) {
      return `${endpoints[0]} (RİNG)`
    }
  }

  // Check Ring from route_stops if metadata absent
  if (route_stops && route_stops.length >= 2) {
    const dirLetter = direction_letter?.toUpperCase() || 'G'
    const dirStops = route_stops.filter(s => s.direction === dirLetter)
    const relevantStops = dirStops.length >= 2 ? dirStops : route_stops
    const first = relevantStops[0]?.stop_name?.trim()
    const last = relevantStops[relevantStops.length - 1]?.stop_name?.trim()
    if (first && last && norm(first) === norm(last)) {
      return `${first} (RİNG)`
    }
  }

  // 2. If we have metadata with endpoints
  if (primaryMeta?.direction_name) {
    const dirLetter = direction_letter?.trim().toUpperCase()

    if (dirLetter === 'G' && gMeta?.direction_name) {
      const ep = splitDashEndpoints(gMeta.direction_name)
      return ep ? `${ep[0]} \u2192 ${ep[1]}` : gMeta.direction_name
    }
    if (dirLetter === 'D' && dMeta?.direction_name) {
      const ep = splitDashEndpoints(dMeta.direction_name)
      return ep ? `${ep[0]} \u2192 ${ep[1]}` : dMeta.direction_name
    }

    // Try matching first_stop (origin from arac mission)
    const ep = splitDashEndpoints(primaryMeta.direction_name)
    if (ep) {
      const [epA, epB] = ep
      if (first_stop) {
        const nFirst = norm(first_stop)
        if (nFirst === norm(epA) || norm(epA).includes(nFirst) || nFirst.includes(norm(epA))) {
          return `${epA} \u2192 ${epB}`
        }
        if (nFirst === norm(epB) || norm(epB).includes(nFirst) || nFirst.includes(norm(epB))) {
          return `${epB} \u2192 ${epA}`
        }
      }

      // Try matching SOAP direction (destination/terminus)
      if (direction) {
        const nDir = norm(direction)
        if (nDir === norm(epB) || norm(epB).includes(nDir) || nDir.includes(norm(epB))) {
          return `${epA} \u2192 ${epB}`
        }
        if (nDir === norm(epA) || norm(epA).includes(nDir) || nDir.includes(norm(epA))) {
          return `${epB} \u2192 ${epA}`
        }
      }

      // Direction unknown: return official IETT dash-separated route name without arrow
      return `${epA} - ${epB}`
    }

    return primaryMeta.direction_name.trim()
  }

  // 3. Fallback to route_stops start & end if available
  if (route_stops && route_stops.length >= 2) {
    const dirLetter = direction_letter?.toUpperCase()
    const dirStops = dirLetter ? route_stops.filter(s => s.direction === dirLetter) : []
    if (dirStops.length >= 2) {
      const first = dirStops[0].stop_name.trim()
      const last = dirStops[dirStops.length - 1].stop_name.trim()
      return `${first} \u2192 ${last}`
    }
    const gStops = route_stops.filter(s => s.direction === 'G')
    const baseStops = gStops.length >= 2 ? gStops : route_stops
    const first = baseStops[0].stop_name.trim()
    const last = baseStops[baseStops.length - 1].stop_name.trim()
    if (first && last && norm(first) !== norm(last)) {
      return `${first} - ${last}`
    }
  }

  // 4. Fallback to route_name if present
  if (route_name && route_name.trim()) {
    return route_name.trim()
  }

  // 5. Fallback to raw direction without a dangling arrow if it's just one stop name
  if (direction && direction.trim()) {
    const clean = direction.trim()
    return clean
  }

  if (first_stop && first_stop.trim()) {
    return first_stop.trim()
  }

  return fallbackText
}

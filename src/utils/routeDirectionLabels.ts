import type { RouteMetadata } from '@/api/client'

/**
 * Extract direction labels (D/G) from route metadata.
 * Handles cases where only one direction has metadata by deriving the other
 * terminal name from the full "A - B" direction_name string.
 * Returns an empty map when metadata is absent; Turkish fallback labels are
 * applied by `getDirectionLabel()`.
 */
function buildLabelMap(metadata: RouteMetadata[] | null, type: 'origin' | 'destination'): Record<string, string> {
  const map: Record<string, string> = {}
  const fullNameByDir: Record<string, string> = {}
  if (!metadata) return map

  for (const m of metadata) {
    if (!m.variant_code || !m.direction_name) continue
    const isBase = m.variant_code.endsWith('_D0') || m.variant_code.endsWith('_G0')
    const dir = m.variant_code.includes('_D_') ? 'D'
      : m.variant_code.includes('_G_') ? 'G'
        : (m.direction === 0 || m.direction === 119) ? 'G'
          : (m.direction === 1 || m.direction === 120) ? 'D'
            : null
    if (!dir) continue
    
    if (!map[dir] || isBase) {
      const parts = m.direction_name.split(' - ')
      map[dir] = (type === 'origin' ? parts[0] : parts[parts.length - 1]).trim()
      fullNameByDir[dir] = m.direction_name
    }
  }

  if (map.D && !map.G) {
    const parts = fullNameByDir.D?.split(' - ') ?? []
    if (parts.length >= 2) map.G = (type === 'origin' ? parts[parts.length - 1] : parts[0]).trim()
  } else if (map.G && !map.D) {
    const parts = fullNameByDir.G?.split(' - ') ?? []
    if (parts.length >= 2) map.D = (type === 'origin' ? parts[parts.length - 1] : parts[0]).trim()
  }

  return map
}

/**
 * Extract direction labels (D/G) from route metadata.
 * Handles cases where only one direction has metadata by deriving the other
 * terminal name from the full "A - B" direction_name string.
 * Returns an empty map when metadata is absent; Turkish fallback labels are
 * applied by `getDirectionLabel()`.
 */
export function getDirectionLabelMap(metadata: RouteMetadata[] | null): Record<string, string> {
  return buildLabelMap(metadata, 'origin')
}

/**
 * Get a label for a direction code, with optional Turkish fallback.
 */
export function getDirectionLabel(code: string, metadata: RouteMetadata[] | null, hasMetadata: boolean = !!metadata?.length): string {
  const map = getDirectionLabelMap(metadata)
  return map[code] ?? (hasMetadata ? code : code === 'G' ? 'Gidiş' : code === 'D' ? 'Dönüş' : code)
}

export function getDestinationLabelMap(metadata: RouteMetadata[] | null): Record<string, string> {
  return buildLabelMap(metadata, 'destination')
}

export function getDestinationLabel(code: string, metadata: RouteMetadata[] | null, hasMetadata: boolean = !!metadata?.length): string {
  const map = getDestinationLabelMap(metadata)
  return map[code] ?? (hasMetadata ? code : code === 'G' ? 'Gidiş' : code === 'D' ? 'Dönüş' : code)
}

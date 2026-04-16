import type { RouteMetadata } from '@/api/client'

/**
 * Extract direction labels (D/G) from route metadata.
 * Handles cases where only one direction has metadata by deriving the other
 * terminal name from the full "A - B" direction_name string.
 * Returns an empty map when metadata is absent; Turkish fallback labels are
 * applied by `getDirectionLabel()`.
 */
export function getDirectionLabelMap(metadata: RouteMetadata[] | null): Record<string, string> {
  const map: Record<string, string> = {}
  const fullNameByDir: Record<string, string> = {}
  if (!metadata) return map

  for (const m of metadata) {
    if (!m.variant_code || !m.direction_name) continue
    const dir = m.variant_code.includes('_D_') ? 'D'
      : m.variant_code.includes('_G_') ? 'G'
        : null
    if (!dir) continue
    const parts = m.direction_name.split(' - ')
    map[dir] = parts[0].trim()
    fullNameByDir[dir] = m.direction_name
  }

  if (map.D && !map.G) {
    const parts = fullNameByDir.D?.split(' - ') ?? []
    if (parts.length >= 2) map.G = parts[parts.length - 1].trim()
  } else if (map.G && !map.D) {
    const parts = fullNameByDir.G?.split(' - ') ?? []
    if (parts.length >= 2) map.D = parts[parts.length - 1].trim()
  }

  return map
}

/**
 * Get a label for a direction code, with optional Turkish fallback.
 */
export function getDirectionLabel(code: string, metadata: RouteMetadata[] | null, hasMetadata: boolean = !!metadata?.length): string {
  const map = getDirectionLabelMap(metadata)
  return map[code] ?? (hasMetadata ? code : code === 'D' ? 'Gidiş' : code === 'G' ? 'Dönüş' : code)
}

import type { RouteMetadata, RouteStop } from '@/api/client'

export const formatStopName = (name: string): string => name.split(' - ')[0].trim()

export interface VariantDisplayNameOptions {
  variantCode: string
  metadata?: RouteMetadata | null
  variantStops?: RouteStop[] | null
}

/**
 * Computes a user-friendly display name for a route variant.
 * Detects ring routes (where the first and last stop are identical)
 * and formats them as "🔄 FirstStop > ApexStop Ring (Suffix)", avoiding
 * the confusing "FirstStop > FirstStop" pattern.
 */
export function getVariantDisplayName({
  variantCode,
  metadata,
  variantStops,
}: VariantDisplayNameOptions): string {
  let label = ''

  if (variantStops && variantStops.length > 1) {
    const first = formatStopName(variantStops[0].stop_name)
    const last = formatStopName(variantStops[variantStops.length - 1].stop_name)

    if (first === last) {
      // Ring route detected! Find apex stop:
      let apex = ''

      // 1. Check metadata direction_name parts if available (e.g. "A - B - A" or "A - B")
      if (metadata?.direction_name) {
        const parts = metadata.direction_name.split(' - ').map((s) => formatStopName(s.trim()))
        if (parts.length >= 3 && parts[0] === parts[parts.length - 1]) {
          apex = parts[1]
        } else if (parts.length >= 2 && parts[0] !== parts[parts.length - 1]) {
          apex = parts[1]
        }
      }

      // 2. Fallback: use midpoint stop along the variant stops
      if (!apex && variantStops.length >= 3) {
        const midIdx = Math.floor(variantStops.length / 2)
        apex = formatStopName(variantStops[midIdx].stop_name)
      }

      const apexText = apex && apex !== first ? ` > ${apex}` : ''
      label = `🔄 ${first}${apexText} Ring`
    } else {
      label = `${first} > ${last}`
    }
  }

  if (!label) {
    if (metadata?.direction_name) {
      const parts = metadata.direction_name.split(' - ').map((s) => s.trim())
      if (parts.length >= 2) {
        const first = formatStopName(parts[0])
        const last = formatStopName(parts[parts.length - 1])
        if (first === last) {
          const apex = parts.length >= 3 ? formatStopName(parts[1]) : ''
          const apexText = apex && apex !== first ? ` > ${apex}` : ''
          label = `🔄 ${first}${apexText} Ring`
        } else {
          label = `${first} > ${last}`
        }
      } else {
        label = metadata.full_name || metadata.direction_name || variantCode
      }
    } else if (metadata?.full_name) {
      label = metadata.full_name
    } else {
      label = variantCode
    }
  }

  const isCanonical = variantCode.endsWith('_D0') || variantCode.endsWith('_G0')
  if (!isCanonical && label !== variantCode) {
    const suffix = variantCode.split('_').pop()
    if (suffix && suffix !== 'G' && suffix !== 'D') {
      label += ` (${suffix})`
    }
  }

  return label
}

/**
 * Human-readable distance formatting.
 * Returns metres for distances < 1 km, kilometres (1 d.p.) otherwise.
 */
export function distanceLabel(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

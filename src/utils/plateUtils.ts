/**
 * Standard Turkish License Plate Regex:
 * 2-digit province code (01-81, or general \d{2}) + 1-3 letters + 2-5 digits
 * e.g. 34 HO 3448, 34 TN 2229, 41 BR 123, 06 BJK 123, 34 A 12345, 34 AAA 12
 */
const TR_PLATE_REGEX = /^(\d{2})([A-Z]{1,3})(\d{2,5})$/

/**
 * Normalizes and formats Turkish vehicle license plates into canonical format:
 * `PROVINCE_CODE LETTERS DIGITS` (separated by single spaces)
 *
 * Examples:
 * - "34  HO  3448" -> "34 HO 3448"
 * - "34TN2229"     -> "34 TN 2229"
 * - "34-tn-2229"   -> "34 TN 2229"
 * - "41BR123"      -> "41 BR 123"
 * - "06bjk123"     -> "06 BJK 123"
 * - "34a12345"     -> "34 A 12345"
 *
 * For non-standard inputs (e.g. test tags or foreign plates), condenses multiple spaces and uppercases.
 */
export function formatPlate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null

  // Convert Turkish dotted/dotless i/ı to ASCII I before uppercase to avoid locale issues
  const clean = trimmed
    .replace(/i/gi, 'I')
    .replace(/ı/gi, 'I')
    .replace(/İ/gi, 'I')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  const match = clean.match(TR_PLATE_REGEX)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`
  }

  // Fallback for non-standard plates: normalize spaces and uppercase
  return trimmed.replace(/\s+/g, ' ').toUpperCase()
}

/**
 * Returns true if the query looks like a Turkish license plate.
 */
export function isPlate(query: string): boolean {
  if (!query) return false
  const clean = query
    .trim()
    .replace(/i/gi, 'I')
    .replace(/ı/gi, 'I')
    .replace(/İ/gi, 'I')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return TR_PLATE_REGEX.test(clean)
}

/**
 * Returns a compact alphanumeric representation for search indexing (e.g. "34HO3448").
 */
export function cleanPlate(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw)
    .replace(/i/gi, 'I')
    .replace(/ı/gi, 'I')
    .replace(/İ/gi, 'I')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

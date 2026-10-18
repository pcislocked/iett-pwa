export type ResolvedIettTarget =
  | { kind: 'route'; code: string }
  | { kind: 'stop'; code: string }
  | { kind: 'search'; query: string }
  | null

/**
 * Safely decodes a URI or string component without throwing on malformed percent sequences.
 */
function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

/**
 * Parses shared text or URL from Web Share Target or clipboard paste.
 * Extracts route codes (hkod) or stop codes (dkod) from iett.istanbul URLs
 * or internal PWA URLs, with robust sanitization and edge-case protection.
 */
export function parseIettShare(rawText?: string | null, rawUrl?: string | null): ResolvedIettTarget {
  // ReDoS guard & null coalescing: truncate to 1000 chars
  const candidate = (rawUrl || rawText || '').trim().slice(0, 1000)
  if (!candidate) return null

  // Safely decode percent-encoded sequences
  const decoded = safeDecodeURIComponent(candidate)

  // Strip trailing punctuation common in chat messages (e.g. "Baksana: https://.../RouteDetail?hkod=14M.")
  const sanitized = decoded.replace(/[.,!?;:)>\]]+$/, '').trim()

  // 1. Check for Route Detail (hkod=, /routes/, /hat-detayi?hat=)
  // Supports formats:
  // - https://iett.istanbul/RouteDetail?hkod=14M
  // - https://iett.istanbul/tr/RouteStation/RouteDetail?hkod=14R
  // - https://iett.istanbul/icerik/hat-detayi?hat=14M
  // - /routes/14M
  const routeMatch =
    sanitized.match(/[?&](?:hkod|hat)=([A-Za-z0-9_-]+)/i) ||
    sanitized.match(/(?:iett\.istanbul|^|\/)(?:routes|hat)\/([A-Za-z0-9_-]+)/i)

  if (routeMatch && routeMatch[1]) {
    const rawCode = routeMatch[1].trim()
    // Validation: 1 to 20 alphanumeric/hyphen/underscore characters (prevent traversal)
    if (/^[A-Za-z0-9_-]{1,20}$/.test(rawCode)) {
      return { kind: 'route', code: rawCode.toUpperCase() }
    }
  }

  // 2. Check for Station / Stop Detail (dkod=, /stops/, /durak-detayi?durak=)
  // Supports formats:
  // - https://iett.istanbul/StationDetail?dkod=259631
  // - https://iett.istanbul/tr/RouteStation/StationDetail?dkod=259631
  // - https://iett.istanbul/icerik/durak-detayi?durak=259631
  // - /stops/259631
  const stopMatch =
    sanitized.match(/[?&](?:dkod|durak)=([0-9]{4,10})/i) ||
    sanitized.match(/(?:iett\.istanbul|^|\/)(?:stops|durak)\/([0-9]{4,10})/i)

  if (stopMatch && stopMatch[1]) {
    const stopCode = stopMatch[1].trim()
    if (/^\d{4,10}$/.test(stopCode)) {
      return { kind: 'stop', code: stopCode }
    }
  }

  // 3. Fallback: If not an external URL but user typed/shared a query string
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    const query = sanitized.slice(0, 100)
    if (query.length > 0) {
      return { kind: 'search', query }
    }
  }

  // 4. If an external URL from iett.istanbul without matched hkod/dkod (e.g. general page)
  if (sanitized.includes('iett.istanbul')) {
    // Check if query parameter q exists
    const qMatch = sanitized.match(/[?&]q=([^&]+)/i)
    if (qMatch && qMatch[1]) {
      return { kind: 'search', query: safeDecodeURIComponent(qMatch[1]).slice(0, 100) }
    }
  }

  return null
}

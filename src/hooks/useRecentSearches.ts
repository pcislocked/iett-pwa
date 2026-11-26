const KEY = 'iett_recent'
const MAX = 25

export interface RecentSearch {
  kind: 'stop' | 'route'
  code: string
  name: string
  direction?: string | null
}

function isValidRecent(item: unknown): item is RecentSearch {
  if (!item || typeof item !== 'object') return false
  const rec = item as Record<string, unknown>
  return (
    (rec.kind === 'stop' || rec.kind === 'route') &&
    typeof rec.code === 'string' &&
    rec.code.length > 0 &&
    typeof rec.name === 'string'
  )
}

export function getRecent(): RecentSearch[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isValidRecent) : []
  } catch {
    return []
  }
}

export function addRecent(item: RecentSearch) {
  try {
    const prev = getRecent().filter((r) => !(r.kind === item.kind && r.code === item.code))
    const next = [item, ...prev].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota or security errors
  }
}

export function clearRecent() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignore storage security errors
  }
}

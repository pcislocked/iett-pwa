const KEY = 'iett_recent'
const MAX = 25

export interface RecentSearch {
  kind: 'stop' | 'route'
  code: string
  name: string
  direction?: string | null
}

export function getRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecentSearch[]
  } catch {
    return []
  }
}

export function addRecent(item: RecentSearch) {
  const prev = getRecent().filter((r) => !(r.kind === item.kind && r.code === item.code))
  const next = [item, ...prev].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function clearRecent() {
  localStorage.removeItem(KEY)
}

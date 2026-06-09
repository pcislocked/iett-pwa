with open('src/hooks/useFleet.ts', 'r', encoding='utf-8') as f: content = f.read()

content = content.replace("error: string | null; refresh: () => void } {", "error: string | null; refresh: () => void; stale: boolean } {")
content = content.replace("refresh: query.refetch,", "refresh: query.refetch,\n    stale: query.isStale,")

with open('src/hooks/useFleet.ts', 'w', encoding='utf-8') as f: f.write(content)

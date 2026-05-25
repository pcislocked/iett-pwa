export function formatStopName(rawName: string) {
  const parts = rawName.split('-').map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return rawName
  const stopName = parts[0]
  let directionPart = parts.slice(1).find(p => p.toUpperCase().includes('YÖN')) || parts[1]
  directionPart = directionPart.replace(/YÖNÜ/i, 'Yönü').trim()
  return `${stopName} - ${directionPart}`
}

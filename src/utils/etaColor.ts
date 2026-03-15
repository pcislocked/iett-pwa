export type EtaBucket = 'soon' | 'coming' | 'close' | 'far'

/** Maps eta_minutes to a named bucket. */
export function etaBucket(minutes: number | null): EtaBucket {
  if (minutes === null || minutes >= 20) return 'far'
  if (minutes < 5)  return 'soon'
  if (minutes < 10) return 'coming'
  return 'close'
}

/** CSS class for inline badge (.eta-* from index.css) */
export function etaBadgeClass(minutes: number | null): string {
  return `eta-${etaBucket(minutes)}`
}

/** Tailwind text-color class for plain text labels */
export function etaTextClass(minutes: number | null): string {
  return `text-eta-${etaBucket(minutes)}`
}

/**
 * Full Tailwind classes for the solid EtaChip pill.
 * Note: orange uses text-black for WCAG AA contrast (~4.5:1).
 */
const CHIP_CLASSES: Record<EtaBucket, string> = {
  soon:   'bg-red-500 text-white',
  coming: 'bg-orange-500 text-black',
  close:  'bg-emerald-500 text-white',
  far:    'bg-slate-700 text-slate-300',
}

export function etaChipClass(minutes: number | null): string {
  return CHIP_CLASSES[etaBucket(minutes)]
}

export type EtaBucket = 'soon' | 'coming' | 'close' | 'far'

/** Maps eta_minutes to a named bucket. */
export function etaBucket(minutes: number | null): EtaBucket {
  if (minutes === null || minutes >= 20) return 'far'
  if (minutes < 5)  return 'soon'
  if (minutes < 10) return 'coming'
  return 'close'
}

const BADGE_CLASSES: Record<EtaBucket, string> = {
  soon: 'eta-soon',
  coming: 'eta-coming',
  close: 'eta-close',
  far: 'eta-far',
}

/** CSS class for inline badge (.eta-* from index.css) */
export function etaBadgeClass(minutes: number | null): string {
  return BADGE_CLASSES[etaBucket(minutes)]
}

const TEXT_CLASSES: Record<EtaBucket, string> = {
  soon: 'text-red-500',
  coming: 'text-orange-500',
  close: 'text-emerald-500',
  far: 'text-slate-500',
}

/** Tailwind text-color class for plain text labels */
export function etaTextClass(minutes: number | null): string {
  return TEXT_CLASSES[etaBucket(minutes)]
}

/**
 * Full Tailwind classes for the solid EtaChip pill.
 * Note: orange uses text-black for WCAG AA contrast (~4.5:1).
 */
const CHIP_CLASSES: Record<EtaBucket, string> = {
  soon: 'bg-red-500 text-white',
  coming: 'bg-orange-500 text-black',
  close: 'bg-emerald-500 text-white',
  far: 'bg-slate-600 text-slate-300',
}

export function etaChipClass(minutes: number | null): string {
  return CHIP_CLASSES[etaBucket(minutes)]
}

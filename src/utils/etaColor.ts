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
  soon: 'text-eta-soon',
  coming: 'text-eta-coming',
  close: 'text-eta-close',
  far: 'text-eta-far',
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
  soon: 'bg-eta-soon text-white',
  coming: 'bg-eta-coming text-black',
  close: 'bg-eta-close text-white',
  far: 'bg-eta-far text-slate-300',
}

export function etaChipClass(minutes: number | null): string {
  return CHIP_CLASSES[etaBucket(minutes)]
}

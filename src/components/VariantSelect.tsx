import { RouteMetadata } from '@/api/client'

interface VariantSelectProps {
  metadata: RouteMetadata[] | null
  direction: string // "G" or "D"
  selectedVariant: string
  onChange: (variant: string) => void
}

export function VariantSelect({ metadata, direction, selectedVariant, onChange }: VariantSelectProps) {
  if (!metadata || metadata.length === 0) return null

  const dirNum = direction === 'G' ? 0 : 1
  const variants = metadata.filter((m) => m.direction === dirNum)

  if (variants.length <= 1) return null // Hide if only one variant

  return (
    <div className="flex flex-col gap-1.5 mb-3">
      <label 
        htmlFor={`variant-select-${direction}`}
        className="text-[10px] font-medium text-slate-500 uppercase tracking-wider px-1"
      >
        Güzergah Varyantı
      </label>
      <div className="relative">
        <select
          id={`variant-select-${direction}`}
          value={selectedVariant}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-surface-muted/30 border border-surface-muted rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
        >
          {variants.map((v) => (
            <option key={v.variant_code} value={v.variant_code} className="bg-surface-card">
              {v.full_name || v.variant_code}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}

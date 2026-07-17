import { RouteMetadata } from '@/api/client'
import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect, useMemo } from 'react'

interface VariantSelectProps {
  metadata: RouteMetadata[] | null
  stopsDirections: string[]
  selectedVariant: string
  selectedDirection: string
  onChange: (variantCode: string, directionCode: string) => void
}

interface VariantOption {
  code: string
  name: string
  isCanonical: boolean
}

export function VariantSelect({ metadata, stopsDirections, selectedVariant, selectedDirection, onChange }: VariantSelectProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Build the hierarchical variant list
  const groups = useMemo(() => {
    // Group Gidiş (direction=0) and Dönüş (direction=1)
    const buildGroup = (dirLetter: string, dirNum: number, label: string) => {
      const groupVariants = metadata ? metadata.filter(m => m.direction === dirNum) : []
      if (groupVariants.length === 0 && !stopsDirections.includes(dirLetter)) return null
      
      const options: VariantOption[] = groupVariants.map(m => {
        return {
          code: m.variant_code,
          name: m.full_name || m.direction_name || m.variant_code,
          isCanonical: m.variant_code.endsWith('_G0') || m.variant_code.endsWith('_D0')
        }
      })
      
      if (options.length === 0 && stopsDirections.includes(dirLetter)) {
        // Fallback option when metadata is missing but we have stops for this direction
        options.push({ code: `UNKNOWN_${dirLetter}`, name: label, isCanonical: true })
      }
      
      // Sort: Canonical first, then alphabetical
      options.sort((a, b) => {
        if (a.isCanonical && !b.isCanonical) return -1
        if (!a.isCanonical && b.isCanonical) return 1
        return a.name.localeCompare(b.name)
      })
      
      return {
        directionCode: dirLetter,
        label,
        options
      }
    }

    const gGroup = buildGroup('G', 0, t('routes.directionG', 'Gidiş'))
    const dGroup = buildGroup('D', 1, t('routes.directionD', 'Dönüş'))
    
    return [gGroup, dGroup].filter(Boolean) as { directionCode: string, label: string, options: VariantOption[] }[]
  }, [metadata, stopsDirections, t])
  
  if (groups.length === 0) return null
  if (groups.length === 1 && groups[0].options.length <= 1) return null // Hide if only one variant overall

  const currentOption = useMemo(() => {
    for (const g of groups) {
      if (g.directionCode === selectedDirection) {
        const opt = g.options.find(o => o.code === selectedVariant)
        if (opt) return { ...opt, directionCode: g.directionCode }
      }
    }
    // Fallback if not found but we have groups
    const fallbackGroup = groups.find(g => g.directionCode === selectedDirection) || groups[0]
    return { ...(fallbackGroup.options[0] || { name: t('common.selectOption', 'Seçiniz'), code: '' }), directionCode: fallbackGroup.directionCode }
  }, [groups, selectedDirection, selectedVariant, t])

  return (
    <div className="flex flex-col gap-1.5 mb-3" ref={containerRef}>
      <label className="text-[10px] font-medium text-text-muted uppercase tracking-wider px-1">
        {t('route.variant', 'Güzergah Seçimi')}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-surface-card border border-surface-border hover:border-brand-500 rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none transition-colors flex items-center justify-between shadow-sm"
        >
          <div className="flex flex-col items-start truncate">
            <span className="truncate w-full text-left font-medium">{currentOption.name}</span>
          </div>
          <svg className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-surface-card border border-surface-border rounded-xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
            {groups.map((g, gIdx) => (
              <div key={g.directionCode} className={gIdx > 0 ? "border-t border-surface-muted/50" : ""}>
                <div className="px-3 py-1.5 bg-surface-muted/20 text-[10px] font-bold text-text-muted uppercase tracking-wider sticky top-0 backdrop-blur-md">
                  {t('route.directionName', { name: g.label, defaultValue: '{{name}} Yönü' })}
                </div>
                <div className="flex flex-col pb-1">
                  {g.options.map((opt) => {
                    const isSelected = selectedDirection === g.directionCode && selectedVariant === opt.code
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => {
                          onChange(opt.code, g.directionCode)
                          setIsOpen(false)
                        }}
                        className={`flex items-center w-full px-3 py-2 text-left transition-colors ${
                          isSelected 
                            ? 'bg-brand-500/10 text-brand-400' 
                            : 'hover:bg-surface-muted/50 text-text-primary'
                        } ${!opt.isCanonical ? 'pl-6' : ''}`}
                      >
                        {opt.isCanonical ? (
                          <span className="font-medium text-sm flex-1">{opt.name}</span>
                        ) : (
                          <span className="text-xs text-text-secondary flex-1">{opt.name}</span>
                        )}
                        {isSelected && (
                          <svg className="w-4 h-4 text-brand-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

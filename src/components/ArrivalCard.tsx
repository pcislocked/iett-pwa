import { type Arrival } from '@/api/client'

function etaClass(minutes: number | null) {
  if (minutes === null) return 'eta-far'
  if (minutes < 5) return 'eta-soon'
  if (minutes < 15) return 'eta-coming'
  return 'eta-far'
}

interface Props {
  arrival: Arrival
  highlighted?: boolean
}

export default function ArrivalCard({ arrival, highlighted = false }: Props) {
  return (
    <div className={`card flex items-center gap-4 transition-all ${
      highlighted ? 'ring-2 ring-brand-500' : ''
    }`}>
      {/* Route badge */}
      <div className="bg-brand-600 text-white font-mono font-bold text-base
                      rounded-lg px-3 py-2 min-w-[4rem] text-center shrink-0">
        {arrival.route_code}
      </div>

      {/* Destination */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate">{arrival.destination}</p>
      </div>

      {/* ETA */}
      <div className="shrink-0 text-right">
        <span className={etaClass(arrival.eta_minutes)}>
          {arrival.eta_minutes !== null ? `${arrival.eta_minutes} dk` : arrival.eta_raw}
        </span>
      </div>
    </div>
  )
}

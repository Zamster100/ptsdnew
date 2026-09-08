import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { getTypeAccent } from '@/lib/getTested/data'
import { GrokProfile } from '@/lib/getTested/types'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  patientNo: string
  handle: string
  traumaIndex: number
  profile: GrokProfile
}

export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(
  ({ patientNo, handle, traumaIndex, profile }, ref) => {
    const accentColor = getTypeAccent(profile.type)

    return (
      <div
        ref={ref}
        className={cn(
          'font-sans relative w-full max-w-lg overflow-hidden rounded-2xl border p-8',
          styles.tierStandard,
        )}
        style={{ boxShadow: `0 0 0 1px ${accentColor}26, 0 20px 40px rgba(0,0,0,0.4)` }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accentColor }} />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: accentColor, opacity: 0.15 }}
        />

        <div className="mb-5 flex items-baseline justify-between">
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accentColor }}
          >
            PTSD-25 · Clinical Chart
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Patient No. {patientNo}
          </span>
        </div>

        <div className="mb-5 h-px w-full bg-white/10" />

        <h3 className="font-manrope mb-4 truncate text-2xl font-black text-white">@{handle}</h3>

        <div className="mb-5 space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-widest text-white/60">
            Trauma Index:{' '}
            <span className="text-base font-bold text-white">{traumaIndex.toLocaleString()}</span> / 9001
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-white/60">
            Type: <span className="font-bold text-white">{profile.type}</span>
          </p>
        </div>

        <div className="mb-5 h-px w-full bg-white/10" />

        <p className="font-manrope text-sm italic leading-[1.7] text-light-text">&ldquo;{profile.note}&rdquo;</p>
      </div>
    )
  },
)

ResultCard.displayName = 'ResultCard'

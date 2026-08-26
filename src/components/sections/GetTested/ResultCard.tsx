import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { SubscaleBars } from './SubscaleBars'
import { getPrimaryClusterColor } from '@/lib/getTested/scoring'
import { ScoreResult } from '@/lib/getTested/types'
import styles from './ResultCard.module.css'
import chromeStyles from './CardChrome.module.css'

interface ResultCardProps {
  patientNo: string
  handle: string
  referredBy: string
  cycle: string
  worst: string
  result: ScoreResult
}

export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(
  ({ patientNo, handle, referredBy, cycle, worst, result }, ref) => {
    const isClean = result.band === 'UNTOUCHED'
    const isDegraded = result.band === 'TERMINAL' || result.band === 'OVER_9000'
    const accentColor = getPrimaryClusterColor(result.clusterScores)

    return (
      <div
        ref={ref}
        className={cn(
          'font-sans relative w-full max-w-lg overflow-hidden rounded-2xl border p-8',
          isClean && styles.tierClean,
          isDegraded && styles.tierDegraded,
          result.band === 'OVER_9000' && styles.tierDegradedExtreme,
          !isClean && !isDegraded && styles.tierStandard,
          !isDegraded && chromeStyles.chartGrid,
        )}
        style={{ boxShadow: `0 0 0 1px ${accentColor}26, 0 20px 40px rgba(0,0,0,0.4)` }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accentColor }} />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: accentColor, opacity: 0.15 }}
        />

        {isDegraded && <div className={styles.grime} />}

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

        <h3 className="font-manrope mb-4 truncate text-2xl font-black text-white">{handle}</h3>

        <div className="mb-5 space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-widest text-white/60">
            Trauma Index:{' '}
            <span className="text-base font-bold text-white">
              {result.traumaIndex.toLocaleString()}
            </span>{' '}
            / 9001
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-white/60">
            Band: <span className="font-bold text-white">{result.bandLabel}</span>
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-white/60">
            Type: <span className="font-bold text-white">{result.resultType}</span>
          </p>
        </div>

        <div className="mb-5 h-px w-full bg-white/10" />

        <SubscaleBars clusterScores={result.clusterScores} />

        <div className="my-5 h-px w-full bg-white/10" />

        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
            Infected by: <span className="text-white/80">{referredBy || 'Self-referred'}</span>
          </p>
          <div className="flex justify-between">
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
              Worst: <span className="text-white/80">{worst}</span>
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
              Cycle: <span className="text-white/80">{cycle}</span>
            </p>
          </div>
        </div>
      </div>
    )
  },
)

ResultCard.displayName = 'ResultCard'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { getTypeAccent } from '@/lib/getTested/data'
import { DiagnosisResult } from '@/lib/getTested/types'
import { CLUSTERS, getBandLabel, getBandTier } from '@/lib/getTested/scoring'
import { CornerStamp } from './CornerStamp'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  result: DiagnosisResult
}

export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(({ result }, ref) => {
  const accentColor = getTypeAccent(result.type)
  const tier = getBandTier(result.band)
  const tierClass =
    tier === 'clean'
      ? styles.tierClean
      : tier === 'degradedExtreme'
        ? cn(styles.tierDegraded, styles.tierDegradedExtreme)
        : tier === 'degraded'
          ? styles.tierDegraded
          : styles.tierStandard

  return (
    <div
      ref={ref}
      className={cn('font-sans relative w-full max-w-lg overflow-hidden rounded-2xl border p-8', tierClass)}
      style={{ boxShadow: `0 0 0 1px ${accentColor}26, 0 20px 40px rgba(0,0,0,0.4)` }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accentColor }} />
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: accentColor, opacity: 0.15 }}
      />
      {(tier === 'degraded' || tier === 'degradedExtreme') && <div className={styles.grime} />}

      <CornerStamp label="Confirmed Diagnosis" color={accentColor} />

      <div className="mb-5 flex items-baseline justify-between">
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: accentColor }}
        >
          PTSD-25 · Clinical Chart
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Patient No. {result.patientNo}
        </span>
      </div>

      <div className="mb-5 h-px w-full bg-white/10" />

      <h3 className="font-manrope mb-4 truncate text-2xl font-black text-white">@{result.handle}</h3>

      <div className="mb-5 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="font-manrope text-2xl font-black text-white">
          {result.traumaIndex.toLocaleString()}
          <span className="font-mono ml-1 text-xs font-normal text-white/40"> / 9001</span>
        </div>
        <div
          className="font-mono rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {getBandLabel(result.band)}
        </div>
      </div>

      <div className="mb-5">
        <p className="font-mono mb-1 text-[9px] uppercase tracking-widest text-white/40">Clinician&apos;s Note</p>
        <p className="font-manrope mb-2 text-xl font-black uppercase" style={{ color: accentColor }}>
          {result.type}
        </p>
        <p
          className="font-manrope border-l-2 pl-3 text-sm italic leading-[1.7] text-light-text"
          style={{ borderColor: accentColor }}
        >
          &ldquo;{result.note}&rdquo;
        </p>
      </div>

      <div className="mb-5 space-y-2">
        {CLUSTERS.map(cluster => {
          const score = result.scores[cluster.id]

          return (
            <div key={cluster.id} className="flex items-center gap-2 text-[10.5px]">
              <span className="w-4 text-center">{cluster.emoji}</span>
              <span className="font-mono w-24 shrink-0 uppercase tracking-[0.03em] text-white/60">
                {cluster.label}
              </span>
              <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(score / 20) * 100}%`, backgroundColor: cluster.color }}
                />
              </div>
              <span className="w-4 text-right text-white">{score}</span>
            </div>
          )
        })}
      </div>

      <div className="h-px w-full bg-white/10" />

      <div className="font-mono mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/60">
        <span>
          <span className="text-white/40">Worst:</span> {result.worst}
        </span>
        {result.memberSince !== null && (
          <>
            <span className="text-white/20">·</span>
            <span>
              <span className="text-white/40">Member Since:</span> {result.memberSince}
            </span>
          </>
        )}
      </div>
    </div>
  )
})

ResultCard.displayName = 'ResultCard'

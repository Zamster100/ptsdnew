import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { getTypeAccent, PROJECT_X_HANDLE } from '@/lib/getTested/data'
import { DiagnosisResult } from '@/lib/getTested/types'
import { CLUSTERS, getBandLabel } from '@/lib/getTested/scoring'
import { CornerStamp } from './CornerStamp'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  result: DiagnosisResult
}

export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(({ result }, ref) => {
  const accentColor = getTypeAccent(result.type)

  return (
    <div
      ref={ref}
      className={cn('font-sans relative w-full max-w-lg overflow-hidden rounded-2xl border p-8', styles.cardBg)}
      style={{ boxShadow: `0 0 0 1px ${accentColor}26, 0 20px 40px rgba(0,0,0,0.4)` }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accentColor }} />
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: accentColor, opacity: 0.15 }}
      />

      <CornerStamp label="Confirmed Diagnosis" color={accentColor} />

      <div className="mb-4 border-b border-dashed border-white/10 pb-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-white/40">
        Patient No.
        <div className="mt-0.5 text-xs font-bold text-white">{result.patientNo}</div>
      </div>

      <div className="mb-6 flex items-start justify-between gap-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-manrope truncate text-2xl font-black leading-tight text-white">@{result.handle}</h3>

          <div className="mt-3.5 flex flex-col gap-2 text-[11.5px]">
            {result.memberSince !== null && (
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">Cycle:</span>
                <span className="text-[13px] font-semibold text-white">{result.memberSince}</span>
              </div>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">Trauma Index:</span>
              <span className="font-manrope text-xl font-black leading-none" style={{ color: accentColor }}>
                {result.traumaIndex.toLocaleString()}
                <small className="font-mono ml-0.5 text-[10.5px] font-normal text-white/40"> / 9001</small>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">Condition:</span>
              <span
                className="font-mono rounded-full border px-2.5 py-0.5 text-[9.5px] uppercase tracking-[0.13em]"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {getBandLabel(result.band)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="relative h-[210px] w-[168px] shrink-0 overflow-hidden rounded"
          style={{ border: `1px solid ${accentColor}`, backgroundColor: '#0d0f0a' }}
        >
          {result.photoUrl ? (
            <>
              <img src={result.photoUrl} alt="patient photo" className="h-full w-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 bg-black/55 py-[3px] text-center font-mono text-[6px] uppercase tracking-[0.1em] text-white">
                Exhibit A
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center border border-dashed border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-white/30">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            </div>
          )}
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

      <div className="font-mono mt-3 flex flex-col gap-1 text-[11px] text-white/60">
        <span>
          <span className="text-white/40">Infected by:</span> @{PROJECT_X_HANDLE}
        </span>
        <span>
          <span className="text-white/40">Worst:</span> {result.worst}
        </span>
        <p className="mt-1 text-[9px] italic text-white/25">Not FDA approved. Not approved by anyone, actually.</p>
      </div>
    </div>
  )
})

ResultCard.displayName = 'ResultCard'

import { forwardRef, CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { getTypeAccent, getTypeAccentLight, PROJECT_X_HANDLE } from '@/lib/getTested/data'
import { DiagnosisResult } from '@/lib/getTested/types'
import { CLUSTERS, getBandLabel } from '@/lib/getTested/scoring'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  result: DiagnosisResult
}

/** Worst two bands get the grime/desaturation escalation pass, on top of whatever type accent color is in play. */
const GRIME_BANDS = new Set(['terminal', 'over9000'])

export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(({ result }, ref) => {
  const accent = getTypeAccent(result.type)
  const accentLight = getTypeAccentLight(result.type)
  const winningCluster = CLUSTERS.find(c => c.typeName === result.type) ?? CLUSTERS[0]
  const bandLabel = getBandLabel(result.band)
  const isGrimed = GRIME_BANDS.has(result.band)

  return (
    <div
      ref={ref}
      className={cn(styles.slab, isGrimed && styles.terminal)}
      style={{ '--accent': accent, '--accent-light': accentLight } as CSSProperties}
    >
      <div className={styles.slabInner}>
        <div className={styles.label}>
          <div className={styles.labelRow1}>
            <span>PTSD</span>
            <span className={styles.num}>#{result.patientNo}</span>
          </div>
          <div className={styles.labelRow2}>
            <span className={styles.typeMini}>{result.type}</span>
            <div className={styles.grade}>
              Diagnosed
              <br />
              <b>{bandLabel}</b>
            </div>
          </div>
          <div className={styles.barcode} />
          <div className={styles.badgeRow}>
            <div className={styles.badge}>P·25</div>
          </div>
        </div>

        <div className={cn(styles.tcard, isGrimed && styles.terminal)}>
          <div className={styles.namePill}>
            <span className={styles.handle}>@{result.handle}</span>
            <span className={styles.power}>{result.traumaIndex.toLocaleString()}</span>
          </div>

          {result.photoUrl ? (
            <div className={styles.window}>
              <img src={result.photoUrl} alt="patient photo" />
              <div className={styles.cornerTag}>Exhibit A</div>
            </div>
          ) : (
            <div className={cn(styles.window, styles.windowEmpty)}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5}>
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            </div>
          )}

          <div className={styles.statStrip}>
            {CLUSTERS.map(cluster => (
              <div key={cluster.id} className={styles.s}>
                <span className={styles.ic}>{cluster.emoji}</span>
                <span className={styles.v}>{result.scores[cluster.id]}</span>
              </div>
            ))}
          </div>

          <div className={styles.traitBox}>
            <div className={styles.traitIcon}>{winningCluster.emoji}</div>
            <div>
              <div className={styles.traitTitle}>{result.type}</div>
              <p className={styles.traitDesc}>&ldquo;{result.note}&rdquo;</p>
            </div>
          </div>

          <div className={styles.tcardFoot}>
            <span>Degens Anonymous Institute</span>
            <div className={styles.waveBadge}>{bandLabel.charAt(0)}</div>
          </div>
        </div>
      </div>
    </div>
  )
})

ResultCard.displayName = 'ResultCard'

import styles from './EkgStrip.module.css'

interface EkgStripProps {
  color: string
  speedSeconds: number
}

/**
 * Scrolling heartbeat trace, ported from the ptsd25.html prototype. Runs
 * continuously behind the whole quiz flow — its color and speed are driven
 * by the caller (current cluster during the quiz, dominant cluster on the
 * result, faster as the live score climbs) rather than owning any state
 * itself.
 */
export const EkgStrip = ({ color, speedSeconds }: EkgStripProps) => (
  <div className={styles.wrap}>
    <svg
      className={styles.track}
      viewBox="0 0 400 46"
      preserveAspectRatio="none"
      style={{ animationDuration: `${speedSeconds}s` }}
    >
      <polyline
        points="0,23 20,23 28,23 34,6 40,40 46,23 60,23 80,23 88,23 94,6 100,40 106,23 120,23 140,23 148,23 154,6 160,40 166,23 180,23 200,23 220,23 228,23 234,6 240,40 246,23 260,23 280,23 288,23 294,6 300,40 306,23 320,23 340,23 348,23 354,6 360,40 366,23 380,23 400,23"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: 'stroke 0.4s ease' }}
      />
    </svg>
  </div>
)

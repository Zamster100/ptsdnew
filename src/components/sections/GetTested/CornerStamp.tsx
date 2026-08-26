interface CornerStampProps {
  label: string
  color?: string
}

/**
 * Rotated rubber-stamp corner tag, ported from the ptsd25.html prototype's
 * card::before treatment — shared by the intro and result cards.
 */
export const CornerStamp = ({ label, color = 'var(--color-ticket-red)' }: CornerStampProps) => (
  <span
    className="absolute right-4 top-4 rotate-3 select-none rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] opacity-60"
    style={{ borderColor: color, color }}
  >
    {label}
  </span>
)

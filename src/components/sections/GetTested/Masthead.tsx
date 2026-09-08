interface MastheadProps {
  deck: string
}

/**
 * Persistent clinical-letterhead header, ported from the ptsd25.html
 * prototype's masthead — sits above the EKG trace on every stage.
 */
export const Masthead = ({ deck }: MastheadProps) => (
  <div className="mb-6">
    <div className="mb-4">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-main-yellow">
        Degens Anonymous Institute
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
        PTSD-25 · Clinical Screening Instrument
      </p>
    </div>

    <p className="font-manrope max-w-2xl text-sm leading-[1.7] text-light-text md:text-base">{deck}</p>
  </div>
)

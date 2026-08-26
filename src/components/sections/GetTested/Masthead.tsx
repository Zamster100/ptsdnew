interface MastheadProps {
  title: string
  deck: string
  liveValue: number
  accentColor: string
}

/**
 * Persistent clinical-letterhead header, ported from the ptsd25.html
 * prototype's masthead — sits above the EKG trace on every stage of the
 * test (intro, quiz, result), not just the intro screen.
 */
export const Masthead = ({ title, deck, liveValue, accentColor }: MastheadProps) => (
  <div className="mb-6">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-main-yellow">
          Degens Anonymous Institute
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
          PTSD-25 · Clinical Screening Instrument
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Live Readout</p>
        <p
          className="font-manrope text-2xl font-black tabular-nums transition-colors duration-300"
          style={{ color: accentColor }}
        >
          {String(liveValue).padStart(3, '0')}
        </p>
      </div>
    </div>

    <h1 className="font-manrope mb-2 text-2xl font-black uppercase leading-tight text-white md:text-3xl">
      {title}
    </h1>
    <p className="font-manrope max-w-lg text-sm leading-[1.7] text-light-text md:text-base">{deck}</p>
  </div>
)

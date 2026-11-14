import { MINT_URL } from '@/lib/mint'

// Big sold-out announcement (used in the tickets page hero).
export const MintBanner = ({ className = '' }: { className?: string }) => (
  <div
    className={`relative z-30 mx-auto w-[calc(100%-30px)] max-w-[720px] rounded-xl border-2 border-ticket-red bg-black/85 px-4 py-4 text-center font-sans text-white shadow-[0_0_42px_rgba(240,81,80,0.45)] backdrop-blur-sm md:px-7 md:py-6 ${className}`}
  >
    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.3em] text-ticket-red md:text-[10px]">
      ● Mint complete
    </p>
    <h2 className="font-manrope mt-1.5 text-[18px] font-black uppercase leading-[1.1] md:text-[36px]">
      PTSD Non Fuddable Tickets
      <br />
      <span className="text-ticket-gold">SOLD OUT</span>
    </h2>
    <a
      href={MINT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-block rounded-lg bg-ticket-red px-6 py-2.5 font-sans text-sm font-bold text-white transition-opacity hover:opacity-80 md:px-8 md:text-base"
    >
      View on OpenSea
    </a>
  </div>
)

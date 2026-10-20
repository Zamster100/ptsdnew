import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { MintCountdown } from '@/components/shared/MintCountdown'
import { MINT_DATE, MINT_URL } from '@/lib/mint'

// The whitelist checker is retired — the list now lives on OpenSea.
export default function WhitelistPage() {
  return (
    <div className="relative h-dvh min-h-[560px] w-full overflow-hidden bg-black font-sans text-white">
      <div aria-hidden="true" className="absolute inset-0">
        <video
          src="/videos/ptsdraffle-web.mp4"
          poster="/images/raffle/raffle-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          className="hidden h-full w-full object-cover md:block"
        />
        <img src="/images/raffle/mraffle.jpg" alt="" className="h-full w-full object-cover md:hidden" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/60" />

      <TicketsHeader />

      <div className="absolute inset-0 z-10 flex items-center justify-center px-[15px] md:px-[60px]">
        <div className="w-full max-w-[720px] rounded-xl border-2 border-ticket-red bg-black/85 px-4 py-6 text-center shadow-[0_0_42px_rgba(240,81,80,0.45)] backdrop-blur-sm md:px-7 md:py-8">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.3em] text-ticket-red md:text-[10px]">
            ● Whitelist finalized
          </p>
          <h1 className="font-manrope mt-1.5 text-[20px] font-black uppercase leading-[1.1] md:text-[34px]">
            The whitelist has moved to OpenSea
          </h1>
          <p className="mx-auto mt-3 max-w-[520px] text-sm text-white/80 md:text-base">
            The whitelist has been finalized and moved over to OpenSea. You will see which group you qualify for.
          </p>
          <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ticket-gold md:text-xs">
            Minting {MINT_DATE}
          </p>
          <MintCountdown size="xl" className="mt-3" />
          <a
            href={MINT_URL}
            className="mt-5 inline-block rounded-lg bg-ticket-red px-6 py-2.5 font-sans text-sm font-bold text-white transition-opacity hover:opacity-80 md:px-8 md:text-base"
          >
            Go to OpenSea
          </a>
        </div>
      </div>
    </div>
  )
}

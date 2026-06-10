import Image from 'next/image'
import { Button } from '@/components/ui/Button'

const stats = [
  { value: '1,333', label: 'Presale spots', gold: false },
  { value: '5', label: 'Golden tickets', gold: true },
  { value: '100x', label: 'Max multiplier', gold: true },
  { value: '30%', label: 'Of collection presold', gold: false },
]

export const HookSection = () => {
  return (
    <section className="section-blend px-[15px] pb-12 pt-16 font-sans text-white md:px-[60px] md:pb-14 md:pt-20">
      {/* 2-col: text left, character + sign right */}
      <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-center">
        {/* Left: text ~45% */}
        <div className="flex-shrink-0 lg:w-[45%]">
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-main-yellow">
            PTSD Show · Pre-token access round
          </p>

          <div className="mb-6">
            <h1 className="font-manrope text-[52px] font-black leading-[1.0] md:text-[72px] lg:text-[80px]">
              NOT AN NFT.
            </h1>
            <h1 className="font-manrope text-[52px] font-black leading-[1.0] text-ticket-red md:text-[72px] lg:text-[80px]">
              A TICKET IN.
            </h1>
          </div>

          <p className="font-manrope mb-3 text-base font-bold text-white md:text-xl">
            <span className="text-ticket-red">PRESALE. PAY NOW. MINT FREE ON OPENSEA.</span>
          </p>

          <p className="font-manrope mb-10 text-base leading-[1.75] text-light-text md:text-lg">
            Your community got you in early. Pay now, mint free on OpenSea
            July 7th. Your rarity determines your PTSD token multiplier — locked
            in at reveal.
          </p>

          <a href="#purchase-section">
            <Button className="px-10">Secure Your Presale Spot</Button>
          </a>

          {/* Launch date */}
          <div className="mt-6 inline-flex items-center gap-4 rounded-xl border border-main-yellow/25 bg-main-yellow/5 px-5 py-3">
            {/* Pulsing live dot */}
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-main-yellow opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-main-yellow" />
            </span>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-main-yellow/70">
                Public Mint
              </p>
              <p className="font-manrope text-xl font-black uppercase tracking-wide text-white md:text-2xl">
                July 7, 2026
              </p>
            </div>
          </div>
        </div>

        {/* Right: character + sign ~55% — transparent PNG, no container styling */}
        <div className="mt-10 flex flex-1 items-end justify-center lg:mt-16 lg:justify-end">
          <Image
            src="/images/beanies.png"
            alt="Character holding cash next to Beanie Babies sale sign"
            width={1300}
            height={875}
            className="w-full max-w-[560px] lg:max-w-none"
            priority
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-light-bg rounded-xl p-5 md:p-6">
            <div
              className={`font-manrope text-3xl font-black md:text-4xl ${s.gold ? 'text-ticket-gold' : 'text-white'}`}
            >
              {s.value}
            </div>
            <div className="font-manrope mt-1 text-sm font-medium text-light-text">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

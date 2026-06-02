import { Button } from '@/components/ui/Button'

export const FinalCTASection = () => {
  return (
    <section className="section-blend relative overflow-hidden px-[15px] py-12 font-sans text-white md:px-[60px] md:py-16">
      {/* Ambient golden glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ticket-red/8 blur-[140px]" />

      <div className="bg-light-bg mb-20 h-[1px] w-full" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="font-manrope mb-6 text-[44px] font-black leading-[1.0] md:text-[64px] lg:text-[80px]">
          4,444 TICKETS.
          <br />
          <span className="text-ticket-gold">5 GOLDEN.</span>
          <br />
          ONE MINT WINDOW.
        </h2>

        <p className="font-manrope mx-auto mb-3 max-w-xl text-base leading-[1.75] text-light-text md:text-lg">
          Every ticket you mint is a rarity reveal. Every rarity reveal is a token
          multiplier locked in. The mint closes when they're gone, or when the
          window ends. After that, tickets only exist on secondary.
        </p>
        <p className="font-manrope mx-auto mb-12 max-w-xl text-base font-medium leading-[1.75] text-white">
          This is the beginning of the PTSD token economy. The ticket is how you
          get in early.
        </p>

        <a href="#purchase-section">
          <Button className="px-14">Purchase Your Ticket</Button>
        </a>
      </div>
    </section>
  )
}

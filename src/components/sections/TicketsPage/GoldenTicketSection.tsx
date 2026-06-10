import { TicketRain } from '@/components/shared/TicketRain'

export const GoldenTicketSection = () => {
  return (
    <section className="section-blend px-[15px] py-10 font-sans md:px-[60px] md:py-14">
      <div className="relative overflow-hidden rounded-3xl border border-ticket-gold/30 bg-gradient-to-br from-ticket-gold/10 via-main-black to-main-black p-8 text-white md:p-12">
        <TicketRain />
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-ticket-gold/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-ticket-gold/8 blur-[80px]" />

        <p className="relative mb-6 font-mono text-xs uppercase tracking-widest text-ticket-gold">
          Golden Ticket
        </p>

        <h2 className="font-manrope relative mb-10 text-[36px] font-black leading-[1.0] text-ticket-gold md:text-[56px] lg:text-[68px]">
          ONLY 5 EXIST.
          <br />
          ONE MINT.
          <br />
          RANDOM REVEAL.
        </h2>

        <div className="relative mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { val: '5', label: 'Golden tickets in existence' },
            { val: '100x', label: 'PTSD token multiplier' },
            { val: 'Same price.', label: 'No premium. Pure chance.' },
          ].map((item) => (
            <div
              key={item.label}
              className="border-l-2 border-ticket-gold/40 pl-5"
            >
              <div className="font-manrope text-3xl font-black text-ticket-gold md:text-4xl">
                {item.val}
              </div>
              <div className="font-manrope mt-1 text-sm text-light-text">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div className="relative max-w-2xl space-y-3">
          <p className="font-manrope text-base leading-[1.75] text-white">
            Each Golden Ticket unlocks a 100x PTSD token multiplier — the highest
            in the entire collection. Five people in the world will pull one. Same
            mint. Same price. Same random chance.
          </p>
          <p className="font-manrope text-base leading-[1.75] text-light-text">
            Most people will mint for early access. A few will pull destiny.
          </p>
          <p className="font-manrope text-sm font-bold text-ticket-gold">
            If you pull Gold, you weren't just early. You were stupid early.
          </p>
        </div>
      </div>
    </section>
  )
}

import { TicketRain } from '@/components/shared/TicketRain'

export const GoldenTicketSection = () => {
  return (
    <section className="section-blend px-[15px] py-10 font-sans md:px-[60px] md:py-14">
      {/* Laser border wrapper — 2px padding becomes the animated border */}
      <div className="golden-laser-wrapper rounded-3xl p-[2px]"
        style={{ boxShadow: '0 0 80px rgba(201,162,39,0.14), 0 0 200px rgba(201,162,39,0.07)' }}
      >
      <div
        className="relative overflow-hidden rounded-[22px] p-8 text-white md:p-12"
        style={{
          background: 'linear-gradient(145deg, #1c1a10 0%, #0e0d08 30%, #070707 60%, #0c0b07 100%)',
          boxShadow: 'inset 0 1px 0 rgba(201,162,39,0.4), inset 0 -1px 0 rgba(0,0,0,0.6)',
        }}
      >
        <TicketRain />

        {/* Hover laser sweep across background */}
        <div className="golden-laser-sweep" />

        {/* Deep corner glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-ticket-gold/12 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-ticket-gold/8 blur-[110px]" />

        {/* Diagonal metallic shine */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(118deg, transparent 15%, rgba(201,162,39,0.07) 38%, rgba(255,255,255,0.07) 50%, rgba(201,162,39,0.05) 62%, transparent 82%)' }}
        />

        {/* Top-edge gold highlight */}
        <div className="pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-ticket-gold/80 to-transparent" />

        {/* Left-edge highlight */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-ticket-gold/50 via-ticket-gold/10 to-transparent" />

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
            Five in the world. Same mint, same price, same random chance as everyone else.
          </p>
          <p className="font-manrope text-sm font-bold text-ticket-gold">
            If you pull Gold, you weren't just early. You were stupid early.
          </p>
        </div>
      </div>
      </div>
    </section>
  )
}

const ITEMS = [
  { text: '4,444 TOTAL SUPPLY', cls: 'text-main-cyan' },
  { text: '5 GOLDEN TICKETS', cls: 'text-ticket-gold' },
  { text: '100x MAX TOKEN MULTIPLIER', cls: 'text-ticket-gold' },
  { text: 'PUBLIC MINT · JULY 7, 2026', cls: 'text-main-yellow' },
  { text: '5 RARITY TIERS', cls: 'text-white/70' },
  { text: 'PRE-TOKEN ACCESS ROUND', cls: 'text-main-cyan' },
  { text: 'SAME PRICE · RANDOM GOLDEN REVEAL', cls: 'text-ticket-gold' },
  { text: 'NOT AN NFT · A TICKET IN', cls: 'text-ticket-red' },
  { text: 'EVERY TICKET = FUTURE PTSD TOKEN ACCESS', cls: 'text-white/70' },
]

const Sep = () => (
  <span className="mx-5 text-[8px] text-white/20">◆</span>
)

const Strip = () => (
  <span className="flex shrink-0 items-center">
    {ITEMS.map((item, i) => (
      <span key={i} className="flex items-center">
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.15em] ${item.cls}`}>
          {item.text}
        </span>
        <Sep />
      </span>
    ))}
  </span>
)

export const TickerBanner = () => (
  <div className="fixed left-0 right-0 top-0 z-[60] flex h-8 items-center overflow-hidden border-b border-white/10 bg-black">
    {/* Left label */}
    <div className="relative z-10 flex h-full shrink-0 items-center bg-ticket-red px-3">
      <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white">
        PRESALE
      </span>
    </div>

    {/* Scrolling strip — two copies for seamless loop */}
    <div className="flex flex-1 overflow-hidden">
      <div className="animate-ticker flex whitespace-nowrap">
        <Strip />
        <Strip />
      </div>
    </div>
  </div>
)

import { HookSection } from '@/components/sections/TicketsPage/HookSection'
import { HeroVideo } from '@/components/sections/Hero/components/HeroVideo'
import { TVSection } from '@/components/sections/TicketsPage/TVSection'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { RaritySection } from '@/components/sections/TicketsPage/RaritySection'
import { GoldenTicketSection } from '@/components/sections/TicketsPage/GoldenTicketSection'
import { WhyNowSection } from '@/components/sections/TicketsPage/WhyNowSection'
import { FAQSection } from '@/components/sections/TicketsPage/FAQSection'
import { FinalCTASection } from '@/components/sections/TicketsPage/FinalCTASection'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PTSD | The Ticket System',
  description: 'Not an NFT. A ticket in. 4,444 PTSD Tickets across 5 rarity tiers, each mapped to a future PTSD token multiplier. See how the system works.',
}

export default function TicketsPage() {
  return (
    <div className="overflow-hidden">
      <TicketsHeader />
      <HeroVideo />
      <TVSection />
      <div className="mx-auto max-w-[1400px]">
        <HookSection />
        <RaritySection />
        <GoldenTicketSection />
        <WhyNowSection />
        <FAQSection />
        <FinalCTASection />
      </div>
    </div>
  )
}

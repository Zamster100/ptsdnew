import { HookSection } from '@/components/sections/TicketsPage/HookSection'
import { HeroVideo } from '@/components/sections/Hero/components/HeroVideo'
import { TVSection } from '@/components/sections/TicketsPage/TVSection'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { RaritySection } from '@/components/sections/TicketsPage/RaritySection'
import { GoldenTicketSection } from '@/components/sections/TicketsPage/GoldenTicketSection'
import { WhyNowSection } from '@/components/sections/TicketsPage/WhyNowSection'
import { FAQSection } from '@/components/sections/TicketsPage/FAQSection'
import { MintSection } from '@/components/sections/TicketsPage/MintSection'
import { FinalCTASection } from '@/components/sections/TicketsPage/FinalCTASection'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PTSD | Purchase Your Ticket',
  description: 'Not an NFT. A ticket in. 4,444 PTSD Tickets. 5 rarity tiers. Every ticket maps to future PTSD token access.',
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
        <MintSection />
        <FinalCTASection />
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ChevronIcon } from '@/components/icons'

const faqs = [
  {
    q: 'Why is this different from a normal NFT?',
    a: "Because it has a specific, stated purpose beyond the art. Every ticket has a direct function - it maps to a future PTSD token allocation. It's not a JPEG. It's a position in something that hasn't fully launched yet.",
  },
  {
    q: 'What if I pull Common?',
    a: "You're still in. Common = 1x PTSD token allocation. That's the same early-access position that won't exist once the token opens to the public. The multiplier is the upside. The allocation is the floor.",
  },
  {
    q: 'What does a Golden Ticket get me?',
    a: "A 100x PTSD token multiplier, the highest in the entire collection. Only 5 Golden Tickets exist across all 4,444 mints. Same price as every other ticket, same random reveal. No way to choose it, no premium to pay for it. If you pull one, you were simply in before almost everyone else.",
  },
  {
    q: 'What is the PTSD token?',
    a: 'PTSD Show is building a token economy around the brand and community. These tickets are the first and only pre-launch access path. Ticket holders are the first wave, before any public round.',
  },
  {
    q: 'What exactly am I paying for right now?',
    a: "You're prepaying your mint. When PTSD Tickets launches on OpenSea (date TBD), guaranteed spot holders mint for free. Your payment today is your ticket in. Everyone else pays mint price on the day.",
  },
  {
    q: 'Is there a limit on how many I can mint?',
    a: '5 tickets per wallet. The guaranteed pool is capped at 30% of the collection (~1,333 tickets total). More tickets mean more rarity rolls and more total allocation stacking across tiers.',
  },
  {
    q: "What happens if I don't get in during the guaranteed round?",
    a: "The guaranteed window closes when the ~1,333 spots are gone, or when the public mint opens (date TBD). After that, you'd need to mint in the public round on OpenSea. No guaranteed pricing, no guaranteed spot. Secondary market is the only other option.",
  },
  {
    q: 'Why should I mint more than one?',
    a: 'Each mint is an independent rarity roll. Multiple tickets mean multiple allocation tiers stacking together. You also materially improve your odds of pulling a high-tier or Golden ticket.',
  },
]

export const FAQSection = () => {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="section-blend overflow-hidden px-[15px] pt-12 font-sans text-white md:px-[60px] md:pt-16">
      <div className="bg-light-bg mb-8 h-[1px] w-full" />

      <div className="flex flex-col gap-12 lg:flex-row lg:items-end">
        {/* Left: FAQ — ~62% */}
        <div className="min-w-0 flex-1 pb-12 md:pb-16">
          <h2 className="font-manrope mb-12 text-[32px] font-black leading-[1.1] md:text-[48px]">
            WHAT YOU'RE
            <br />
            <span className="text-ticket-red">PROBABLY THINKING.</span>
          </h2>

          <div className="divide-y divide-white/10">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  className="flex w-full cursor-pointer items-center justify-between py-5 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="font-manrope pr-6 text-base font-medium text-white md:text-lg">
                    / {faq.q}
                  </span>
                  <ChevronIcon
                    className={cn(
                      'flex-shrink-0 text-light-text transition-transform duration-200',
                      open === i && 'rotate-180',
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    open === i ? 'max-h-60 pb-5' : 'max-h-0',
                  )}
                >
                  <p className="font-manrope text-base leading-[1.75] text-light-text">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: character — ~38%, bottom-aligned with FAQ column */}
        <div className="hidden overflow-hidden lg:block lg:w-[34%]">
          <Image
            src="/images/sd-mask.png"
            alt="PTSD Show character"
            width={840}
            height={1080}
            className="w-full"
          />
        </div>
      </div>
    </section>
  )
}

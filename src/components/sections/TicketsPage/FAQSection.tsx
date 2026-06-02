'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ChevronIcon } from '@/components/icons'

const faqs = [
  {
    q: 'Why is this different from a normal NFT?',
    a: "Because it has a specific, stated purpose beyond the art. Every ticket has a direct function — it maps to a future PTSD token allocation. It's not a JPEG. It's a position in something that hasn't fully launched yet.",
  },
  {
    q: 'What if I pull Common?',
    a: "You're still in. A Common ticket gives you base PTSD token allocation — the same early-access position that won't exist once the token opens to the public. The floor is the point.",
  },
  {
    q: 'What is the PTSD token?',
    a: 'PTSD Show is building a token economy around the brand and community. These tickets are the first and only pre-launch access path. Ticket holders are the first wave — before any public round.',
  },
  {
    q: 'Is there a limit on how many I can mint?',
    a: 'No enforced cap. Mint as few or as many as makes sense to you. The math on multiple mints is straightforward — more tickets, more rolls, more total allocation across tiers.',
  },
  {
    q: "What happens if I don't mint?",
    a: "The ticket window closes when all 4,444 are gone or the mint ends. After that, this allocation path doesn't exist. Secondary market is the only option — at whatever price holders decide.",
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

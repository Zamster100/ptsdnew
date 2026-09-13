'use client'

import { useState, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronIcon } from '@/components/icons'

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: 'Why is this different from a normal NFT?',
    a: "Because it has a specific, stated purpose beyond the art. Every ticket has a direct function - it maps to a future PTSD token allocation. It's not a JPEG. It's a position in something that hasn't fully launched yet.",
  },
  {
    q: 'What if I pull Common?',
    a: "You're still holding a real position. Common = 1x PTSD token multiplier — the multiplier is the upside, holding any ticket at all is the floor.",
  },
  {
    q: 'What does a Golden Ticket get me?',
    a: "A 100x PTSD token multiplier, the highest in the entire collection. Only 3 Golden Tickets exist across all 3,333 mints. Same price as every other ticket, same random reveal. No way to choose it, no premium to pay for it. If you pull one, you were simply in before almost everyone else.",
  },
  {
    q: 'What is the PTSD token?',
    a: 'PTSD Show is building a token economy around the brand and community. Ticket holders are positioned first, ahead of the wider token launch.',
  },
  {
    q: 'What is a PTSD Ticket, exactly?',
    a: "A PTSD Ticket is an NFT that maps to a rarity tier and a token multiplier for the upcoming PTSD token economy. It's not the token itself — it's your position ahead of it.",
  },
  {
    q: 'How do I get considered for one?',
    a: (
      <>
        Right now, the path in is the PTSD-25 diagnostic.{' '}
        <Link href="/get-tested" className="text-ticket-red underline underline-offset-2">
          Get Diagnosed
        </Link>
        , and you&apos;ll find out where you stand.
      </>
    ),
  },
  {
    q: 'When does the PTSD token launch?',
    a: 'Date TBD. Tickets are the access layer that exists ahead of it — rarity and multiplier are locked in at reveal, well before any token event.',
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

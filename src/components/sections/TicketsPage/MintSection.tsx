'use client'

import Image from 'next/image'
import { HelioCheckout } from '@heliofi/checkout-react'

const helioConfig = {
  paylinkId: '6a0751538f30fd2db4f3abdf',
  theme: { themeMode: 'dark' },
  primaryColor: '#CC003F',
  neutralColor: '#5A6578',
  stretchFullWidth: true,
}

export const MintSection = () => {
  return (
    <section
      id="purchase-section"
      className="section-blend overflow-hidden px-[15px] pt-12 font-sans text-white md:px-[60px] md:pt-16"
    >
      <div className="bg-light-bg mb-8 h-[1px] w-full" />

      <div className="flex flex-col lg:flex-row lg:items-end">
        {/* Left: text + widget stacked (~60%) */}
        <div className="flex-1 pb-12 md:pb-16">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-main-yellow">
            Presale · Purchase now
          </p>
          <h2 className="font-manrope mb-3 text-[32px] font-black leading-[1.1] md:text-[48px]">
            PURCHASE YOUR
            <br />
            <span className="text-ticket-red">TICKETS.</span>
          </h2>
          <p className="font-manrope mb-8 max-w-xl text-base leading-[1.75] text-light-text">
            4,444 tickets. 5 rarity tiers. Every ticket maps to future PTSD token
            access. The more you purchase, the more allocation you lock in before
            anyone else.
          </p>

          <div className="w-[90%]">
            <HelioCheckout config={helioConfig} />
          </div>
        </div>

        {/* Right: character — bottom of image aligns with section bottom */}
        <div className="hidden overflow-hidden lg:block lg:w-[42%]">
          <Image
            src="/images/pt-character.png"
            alt="PTSD Show character"
            width={1000}
            height={1050}
            className="w-full"
          />
        </div>
      </div>
    </section>
  )
}

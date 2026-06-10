'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { HelioCheckout } from '@heliofi/checkout-react'

const helioConfig = {
  paylinkId: '6a0751538f30fd2db4f3abdf',
  theme: { themeMode: 'dark' as const },
  primaryColor: '#CC003F',
  neutralColor: '#5A6578',
  stretchFullWidth: true,
}

const SuccessModal = ({ onClose }: { onClose: () => void }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)

    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#111] p-8 md:p-12">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 font-mono text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:text-white/80"
        >
          [ close ]
        </button>

        {/* Emoji */}
        <div className="mb-6 text-5xl">🎉</div>

        {/* Heading */}
        <h2 className="font-manrope mb-4 text-[28px] font-black leading-[1.1] text-white md:text-[36px]">
          Boom. You're officially in.
        </h2>

        {/* Body */}
        <div className="space-y-4 font-sans text-base leading-[1.75] text-light-text">
          <p>
            You snagged your spot in the presale, and your future self thanks you.
          </p>
          <p>
            Here's what happens next: keep your eyes on our{' '}
            <a
              href="https://x.com/PTSDshow"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              X
            </a>{' '}
            for the public mint announcement. When Tickets launches, you'll mint
            your NFT right on OpenSea. And the best part? Since you already
            paid, your mint is on the house.{' '}
            <span className="text-white font-semibold">Free. Zero. Nada.</span>
          </p>
          <p>Sit tight and stay tuned. The good stuff is coming.</p>
        </div>

        {/* CTA */}
        <a
          href="https://x.com/PTSDshow"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-sans text-sm font-bold text-black transition-opacity hover:opacity-80"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.849L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
          Follow us on X for updates
        </a>
      </div>
    </div>
  )
}

export const MintSection = () => {
  const [showSuccess, setShowSuccess] = useState(false)
  const handleClose = useCallback(() => setShowSuccess(false), [])

  const config = {
    ...helioConfig,
    onSuccess: () => setShowSuccess(true),
  }

  return (
    <>
      {showSuccess && <SuccessModal onClose={handleClose} />}

      <section
        id="purchase-section"
        className="section-blend overflow-hidden px-[15px] pt-12 font-sans text-white md:px-[60px] md:pt-16"
      >
        <div className="bg-light-bg mb-8 h-[1px] w-full" />

        <div className="flex flex-col lg:flex-row lg:items-end">
          {/* Left: text + widget stacked */}
          <div className="flex-1 pb-12 md:pb-16">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-main-yellow">
              Presale · Purchase now
            </p>
            <h2 className="font-manrope mb-3 text-[32px] font-black leading-[1.1] md:text-[48px]">
              SECURE YOUR
              <br />
              <span className="text-ticket-red">PRESALE SPOT.</span>
            </h2>
            <p className="font-manrope mb-8 max-w-xl text-base leading-[1.75] text-light-text">
              Pay now, mint free on OpenSea on July 7th. 1,333 presale spots
              across 5 rarity tiers. The more you secure, the more allocation
              you lock in before anyone else.
            </p>

            <div className="w-[90%]">
              <HelioCheckout config={config} />
            </div>
          </div>

          {/* Right: character */}
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
    </>
  )
}

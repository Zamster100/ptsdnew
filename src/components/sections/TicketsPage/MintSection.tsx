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

const DISCORD_URL = 'https://discord.com/invite/PTSDshow'

const SuccessModal = ({
  onClose,
  mintWallet,
  quantity,
  transaction,
}: {
  onClose: () => void
  mintWallet?: string | null
  quantity?: number
  transaction?: string
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const shortTx = transaction && transaction.length > 12
    ? `${transaction.slice(0, 8)}...${transaction.slice(-4)}`
    : transaction ?? null

  const solscanUrl = transaction
    ? `https://solscan.io/tx/${transaction}?cluster=mainnet`
    : null

  const shortMintWallet = mintWallet && mintWallet.length > 10
    ? `${mintWallet.slice(0, 6)}...${mintWallet.slice(-4)}`
    : mintWallet ?? null

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

        {/* Receipt rows */}
        <div className="mb-6 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03]">
          {shortTx && (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">Transaction ID</span>
              {solscanUrl ? (
                <a
                  href={solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={transaction}
                  className="font-mono text-xs text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                >
                  {shortTx}
                </a>
              ) : (
                <span className="font-mono text-xs text-white/70">{shortTx}</span>
              )}
            </div>
          )}
          {quantity && (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">Quantity</span>
              <span className="font-mono text-xs text-white/70">{quantity}</span>
            </div>
          )}
          {shortMintWallet && (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">Whitelisted Address</span>
              <span className="font-mono text-xs text-white/70" title={mintWallet ?? undefined}>
                {shortMintWallet}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="space-y-4 font-sans text-base leading-[1.75] text-light-text">
          <p>
            You snagged your guaranteed spot and your future self thanks you.
          </p>
          <p>
            For <span className="font-semibold text-white">live NFT mint updates and detailed status</span>, join our Discord. That's where we'll post allowlist confirmations, mint instructions, and everything you need when the date is confirmed.
          </p>
          <p>
            Follow us on{' '}
            <a
              href="https://x.com/PTSDshow"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              X
            </a>{' '}
            for the public mint announcement. When it drops, your mint is on the house.{' '}
            <span className="font-semibold text-white">Free. Zero. Nada.</span>
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ticket-red px-6 py-3 font-sans text-sm font-bold text-white transition-opacity hover:opacity-80"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
              <path d="M15.247 1.16A14.974 14.974 0 0 0 11.53.004a.056.056 0 0 0-.06.028c-.16.285-.338.657-.462.95a13.826 13.826 0 0 0-4.015 0 9.65 9.65 0 0 0-.47-.95.058.058 0 0 0-.06-.028A14.933 14.933 0 0 0 2.75 1.16a.052.052 0 0 0-.024.02C.398 4.612-.238 7.976.074 11.3a.062.062 0 0 0 .023.042 15.053 15.053 0 0 0 4.532 2.29.058.058 0 0 0 .063-.02 10.748 10.748 0 0 0 .926-1.506.057.057 0 0 0-.031-.079 9.904 9.904 0 0 1-1.415-.675.058.058 0 0 1-.006-.096c.095-.071.19-.145.28-.22a.056.056 0 0 1 .058-.008c2.967 1.354 6.178 1.354 9.11 0a.056.056 0 0 1 .059.007c.09.076.185.15.28.221a.058.058 0 0 1-.005.096 9.295 9.295 0 0 1-1.416.674.057.057 0 0 0-.03.08c.272.519.582 1.015.924 1.505a.057.057 0 0 0 .063.021 15.01 15.01 0 0 0 4.54-2.29.058.058 0 0 0 .023-.041c.378-3.91-.632-7.246-2.676-10.12a.046.046 0 0 0-.023-.021ZM6.013 9.263c-.866 0-1.58-.795-1.58-1.772 0-.977.7-1.772 1.58-1.772.886 0 1.593.802 1.58 1.772 0 .977-.7 1.772-1.58 1.772Zm5.84 0c-.866 0-1.58-.795-1.58-1.772 0-.977.7-1.772 1.58-1.772.887 0 1.594.802 1.58 1.772 0 .977-.693 1.772-1.58 1.772Z" />
            </svg>
            Join Discord for updates
          </a>
          <a
            href="https://x.com/PTSDshow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-sans text-sm font-bold text-white transition-colors hover:border-white/40 hover:bg-white/5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.849L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
            Follow on X
          </a>
        </div>
      </div>
    </div>
  )
}

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export const MintSection = () => {
  const [walletInput, setWalletInput] = useState('')
  const [successData, setSuccessData] = useState<{
    transaction: string
    mintWallet: string | null
    quantity: number
  } | null>(null)
  const handleClose = useCallback(() => setSuccessData(null), [])

  const isValidWallet = ETH_ADDRESS_RE.test(walletInput.trim())

  const config = {
    ...helioConfig,
    autofill: {
      additionalProductValue: walletInput.trim(),
    },
    onSuccess: (event: { data: unknown; transaction: string }) => {
      const d = event.data as Record<string, unknown>
      setSuccessData({
        transaction: event.transaction,
        mintWallet: walletInput.trim() || null,
        quantity: Number(d?.quantity ?? d?.amount ?? 1),
      })
    },
  }

  return (
    <>
      {successData && (
        <SuccessModal
          onClose={handleClose}
          mintWallet={successData.mintWallet}
          quantity={successData.quantity}
          transaction={successData.transaction}
        />
      )}

      <section
        id="purchase-section"
        className="section-blend overflow-hidden px-[15px] pt-12 font-sans text-white md:px-[60px] md:pt-16"
      >
        <div className="bg-light-bg mb-8 h-[1px] w-full" />

        <div className="flex flex-col lg:flex-row lg:items-end">
          {/* Left: text + widget stacked */}
          <div className="flex-1 pb-12 md:pb-16">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-main-yellow">
              Guaranteed · Purchase now
            </p>
            <h2 className="font-manrope mb-3 text-[32px] font-black leading-[1.1] md:text-[48px]">
              SECURE YOUR
              <br />
              <span className="text-ticket-red">GUARANTEED SPOT.</span>
            </h2>
            <p className="font-manrope mb-8 max-w-xl text-base leading-[1.75] text-light-text">
              Pay now, mint free on OpenSea (date TBD). 1,333 guaranteed spots
              across 5 rarity tiers. The more you secure, the more allocation
              you lock in before anyone else.
            </p>

            {/* Wallet input */}
            <div className="mb-6 w-[90%]">
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/50">
                Ethereum Wallet Address <span className="text-ticket-red">*</span>
              </label>
              <input
                type="text"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
              />
              <p className="mt-1.5 font-sans text-xs text-white/30">
                This is the wallet that will be allowlisted for the OpenSea mint (date TBD).
              </p>
            </div>

            {/* Helio widget — only mounts once a valid ETH address is entered so autofill is correct */}
            <div className="w-[90%]">
              {isValidWallet ? (
                <HelioCheckout config={config} />
              ) : (
                <div
                  className="flex cursor-not-allowed flex-col items-center justify-center gap-3 rounded-xl border border-white/5 py-14"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p className="font-mono text-xs uppercase tracking-widest text-white/30">
                    Enter your ETH wallet above to unlock payment
                  </p>
                </div>
              )}
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

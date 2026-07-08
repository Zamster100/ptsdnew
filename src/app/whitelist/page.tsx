'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'

const ETH_RE = /^0x[a-fA-F0-9]{40}$/
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

type Status = 'idle' | 'loading' | 'whitelisted' | 'not-whitelisted' | 'error'

export default function WhitelistPage() {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [quantity, setQuantity] = useState(0)
  const [error, setError] = useState('')

  const isValid = ETH_RE.test(input.trim()) || SOL_RE.test(input.trim())

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    const wallet = input.trim()
    if (!isValid) return
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(`/api/whitelist?wallet=${encodeURIComponent(wallet)}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Lookup failed')
        setStatus('error')
      } else {
        setQuantity(json.quantity ?? 0)
        setStatus(json.whitelisted ? 'whitelisted' : 'not-whitelisted')
      }
    } catch {
      setError('Network error — please try again')
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-sans text-white">
      <TicketsHeader />

      <div className="flex flex-1 flex-col justify-center px-[15px] pb-16 pt-32 md:px-[60px]">
        <div className="mx-auto w-full max-w-2xl">

          {/* Back */}
          <Link
            href="/tickets"
            className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to tickets
          </Link>

          {/* Heading */}
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-main-yellow">
            Whitelist Check
          </p>
          <h1 className="font-manrope mb-3 text-[32px] font-black leading-[1.1] md:text-[48px]">
            AM I ON THE
            <br />
            <span className="text-ticket-red">WHITELIST?</span>
          </h1>
          <p className="mb-10 max-w-lg text-base leading-[1.75] text-light-text">
            Enter your Solana or Ethereum wallet address to check your
            whitelist status.
          </p>

          {/* Form */}
          <form onSubmit={handleCheck} className="mb-10">
            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/50">
              Wallet Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setStatus('idle')
                }}
                placeholder="0x... or Solana address"
                spellCheck={false}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
              />
              <button
                type="submit"
                disabled={!isValid || status === 'loading'}
                className="flex items-center gap-2 rounded-xl bg-ticket-red px-6 py-3 font-sans text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {status === 'loading' ? (
                  'Checking…'
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Check
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Result */}
          {status === 'error' && (
            <p className="font-mono text-xs text-ticket-red">{error}</p>
          )}

          {status === 'whitelisted' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-10 text-center">
              <p className="font-manrope text-2xl font-black text-emerald-400">
                YOU&apos;RE WHITELISTED
              </p>
              <p className="mt-2 text-sm text-white/50">
                {quantity} spot{quantity === 1 ? '' : 's'} reserved for this wallet.
              </p>
            </div>
          )}

          {status === 'not-whitelisted' && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
              <p className="font-manrope text-2xl font-black text-white/60">
                NOT WHITELISTED
              </p>
              <p className="mt-2 text-sm text-white/30">
                This wallet isn&apos;t on the whitelist yet.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'

interface MintRecord {
  id: string
  eth_wallet: string
  sol_transaction: string
  quantity: number
  created_at: string
}

const ETH_RE = /^0x[a-fA-F0-9]{40}$/

function shortTx(tx: string) {
  return tx.length > 12 ? `${tx.slice(0, 8)}...${tx.slice(-4)}` : tx
}

function txUrl(tx: string) {
  return tx.startsWith('0x')
    ? `https://etherscan.io/tx/${tx}`
    : `https://solscan.io/tx/${tx}?cluster=mainnet`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mints, setMints] = useState<MintRecord[] | null>(null)
  const [lookedUpWallet, setLookedUpWallet] = useState('')
  const [error, setError] = useState('')

  const isValid = ETH_RE.test(input.trim())

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const wallet = input.trim()
    if (!isValid) return
    setLoading(true)
    setError('')
    setMints(null)
    try {
      const res = await fetch(`/api/lookup?wallet=${encodeURIComponent(wallet)}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Lookup failed')
      } else {
        setMints(json.mints)
        setLookedUpWallet(wallet)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const totalQty = mints?.reduce((sum, m) => sum + m.quantity, 0) ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-sans text-white">
      <TicketsHeader />

      {/* Vertically centered content — expands naturally when results appear */}
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
            Mint Lookup · Check your purchase
          </p>
          <h1 className="font-manrope mb-3 text-[32px] font-black leading-[1.1] md:text-[48px]">
            VERIFY YOUR
            <br />
            <span className="text-ticket-red">GUARANTEED SPOT.</span>
          </h1>
          <p className="mb-10 max-w-lg text-base leading-[1.75] text-light-text">
            Enter the ETH wallet you used during checkout to see your purchase
            history, transaction IDs, and quantity secured.
          </p>

          {/* Lookup form */}
          <form onSubmit={handleLookup} className="mb-10">
            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/50">
              Ethereum Wallet Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
              />
              <button
                type="submit"
                disabled={!isValid || loading}
                className="flex items-center gap-2 rounded-xl bg-ticket-red px-6 py-3 font-sans text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? (
                  'Looking up…'
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Look up
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <p className="mb-6 font-mono text-xs text-ticket-red">{error}</p>
          )}

          {/* Results */}
          {mints !== null && (
            <div>
              <div className="mb-4 flex items-baseline gap-3">
                <p className="font-mono text-xs text-white/40">
                  {lookedUpWallet.slice(0, 6)}...{lookedUpWallet.slice(-4)}
                </p>
                <span className="font-mono text-xs text-white/20">·</span>
                <p className="font-mono text-xs text-white/40">
                  {mints.length === 0
                    ? 'No purchases found'
                    : `${mints.length} purchase${mints.length > 1 ? 's' : ''} · ${totalQty} spot${totalQty > 1 ? 's' : ''} secured`}
                </p>
              </div>

              {mints.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
                  <p className="font-mono text-xs uppercase tracking-widest text-white/30">
                    No mints found for this wallet.
                  </p>
                  <p className="mt-2 text-sm text-white/20">
                    Make sure you entered the exact ETH wallet used at checkout.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="grid grid-cols-3 gap-4 px-4 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">Date</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">Transaction</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/25 text-right">Qty</span>
                  </div>
                  {mints.map((mint) => (
                    <div
                      key={mint.id}
                      className="grid grid-cols-3 items-center gap-4 px-4 py-3"
                    >
                      <span className="font-mono text-xs text-white/60">
                        {formatDate(mint.created_at)}
                      </span>
                      <a
                        href={txUrl(mint.sol_transaction)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={mint.sol_transaction}
                        className="font-mono text-xs text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                      >
                        {shortTx(mint.sol_transaction)}
                      </a>
                      <span className="font-mono text-xs text-right text-white/70">
                        {mint.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

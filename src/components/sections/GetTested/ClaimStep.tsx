'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CornerStamp } from './CornerStamp'

interface ClaimStepProps {
  diagnosisId: number
  onClaimed: () => void
}

const ETH_RE = /^0x[a-fA-F0-9]{40}$/

export const ClaimStep = ({ diagnosisId, onClaimed }: ClaimStepProps) => {
  const [wallet, setWallet] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = ETH_RE.test(wallet.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/get-tested/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosisId, wallet: wallet.trim() }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Try again.')

        return
      }

      onClaimed()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left md:p-10">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ticket-red via-main-yellow to-ticket-red" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ticket-red/20 blur-3xl" />

        <CornerStamp label="Step 3 / 3" />

        <h2 className="font-manrope mb-3 text-2xl font-black uppercase leading-tight text-white md:text-3xl">
          Claim Your Spot
        </h2>
        <p className="font-manrope mb-8 max-w-lg text-sm leading-[1.7] text-light-text">
          Enter your wallet to lock in your entry.
        </p>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/50">
              Wallet address
            </label>
            <input
              type="text"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              placeholder="0x..."
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
            />
          </div>

          {error && <p className="font-mono text-xs text-ticket-red">{error}</p>}

          <Button
            type="submit"
            variant="outline"
            disabled={!isValid || submitting}
            className="mt-4 w-full justify-center border-ticket-red text-white hover:bg-ticket-red/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Claiming…' : 'Claim Ticket'}
          </Button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CornerStamp } from './CornerStamp'

interface IntroStepProps {
  onBegin: (handle: string, referredBy: string) => void
}

export const IntroStep = ({ onBegin }: IntroStepProps) => {
  const [handle, setHandle] = useState('')
  const [referredBy, setReferredBy] = useState('')

  const trimmedHandle = handle.trim()
  const isValid = trimmedHandle.length > 0 && trimmedHandle.length <= 32

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onBegin(trimmedHandle, referredBy.trim())
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left md:p-8">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ticket-red via-main-yellow to-ticket-red" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ticket-red/20 blur-3xl" />

        <CornerStamp label="Intake" />

        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/50">
          Before we begin
        </p>
        <p className="font-manrope mb-8 max-w-lg text-sm leading-[1.7] text-light-text">
          25 scored items across five clusters, plus two reverse-scored items to
          catch straight-liners. Answer honestly — it doesn't count if you lie.
        </p>

        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/50">
              Your handle
            </label>
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="@yourname"
              maxLength={32}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/50">
              Referred by <span className="normal-case text-white/25">(optional)</span>
            </label>
            <input
              type="text"
              value={referredBy}
              onChange={e => setReferredBy(e.target.value)}
              placeholder="@whoever sent you"
              maxLength={32}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-white/30"
            />
          </div>

          <Button type="submit" variant="outline" className="mt-4 w-full justify-center border-ticket-red text-white hover:bg-ticket-red/10">
            Begin Evaluation
          </Button>
        </form>
      </div>
    </div>
  )
}

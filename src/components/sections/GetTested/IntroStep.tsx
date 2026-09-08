'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CornerStamp } from './CornerStamp'

interface IntroStepProps {
  onBegin: (handle: string) => void
}

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/

export const IntroStep = ({ onBegin }: IntroStepProps) => {
  const [handle, setHandle] = useState('')

  const trimmedHandle = handle.trim().replace(/^@/, '')
  const isValid = HANDLE_RE.test(trimmedHandle)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onBegin(trimmedHandle)
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left md:p-10">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ticket-red via-main-yellow to-ticket-red" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ticket-red/20 blur-3xl" />

        <CornerStamp label="Step 1 / 3" />

        <h2 className="font-manrope mb-3 text-3xl font-black uppercase leading-tight text-white md:text-4xl">
          Begin Diagnosis
        </h2>
        <p className="font-manrope mb-8 max-w-xl text-sm leading-[1.7] text-light-text md:text-base">
          Every diagnosis qualifies. Finish the intake, spread it, and lock in your wallet — that&apos;s the whole
          whitelist.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 py-2 pl-6 pr-2 transition-colors focus-within:border-ticket-red/60 md:py-3">
            <span className="font-mono text-lg text-white/30 md:text-2xl">@</span>
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="yourname"
              maxLength={16}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-lg text-white placeholder-white/20 outline-none md:text-2xl"
            />
            <button
              type="submit"
              disabled={!isValid}
              className={cn(
                'shrink-0 rounded-full bg-ticket-red px-6 py-3 font-manrope text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 md:px-8 md:py-4 md:text-base',
              )}
            >
              Begin Diagnosis
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

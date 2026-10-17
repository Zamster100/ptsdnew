'use client'

import { useEffect, useState } from 'react'
import { MINT_AT } from '@/lib/mint'

const pad = (n: number) => String(n).padStart(2, '0')

export const MintCountdown = ({
  size = 'md',
  className = '',
}: {
  size?: 'md' | 'xl'
  className?: string
}) => {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(t)
  }, [])

  const ms = now == null ? null : Math.max(0, MINT_AT - now)
  const parts =
    ms == null
      ? null
      : [
          ['DAYS', Math.floor(ms / 864e5)],
          ['HRS', Math.floor(ms / 36e5) % 24],
          ['MIN', Math.floor(ms / 6e4) % 60],
          ['SEC', Math.floor(ms / 1e3) % 60],
        ]
  const big = size === 'xl'

  if (ms === 0) {
    return (
      <p className={`font-manrope font-black uppercase text-ticket-gold ${big ? 'text-2xl md:text-4xl' : 'text-xl'} ${className}`}>
        Minting now
      </p>
    )
  }

  return (
    <div className={`flex items-start justify-center gap-2 md:gap-3 ${className}`} aria-label="Countdown to mint">
      {(parts ?? [['DAYS', 0], ['HRS', 0], ['MIN', 0], ['SEC', 0]]).map(([label, n]) => (
        <div
          key={label as string}
          className={`flex flex-col items-center rounded-lg border border-white/20 bg-black/70 ${big ? 'min-w-[45px] px-1.5 py-1.5 md:min-w-[67px] md:px-3 md:py-2' : 'min-w-[52px] px-2 py-1.5'}`}
        >
          <span className={`font-mono font-black tabular-nums text-white ${big ? 'text-2xl md:text-[42px]' : 'text-2xl'}`}>
            {parts ? pad(n as number) : '--'}
          </span>
          <span className={`font-mono tracking-[0.2em] text-ticket-gold ${big ? 'text-[7px] md:text-[9px]' : 'text-[9px]'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

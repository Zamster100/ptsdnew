'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const rarities = [
  { name: 'Common',    count: 3000, multiplier: '1x',    color: '#f97316', pct: '67%' },
  { name: 'Rare',      count: 1000, multiplier: '2x',    color: '#ef4444', pct: '22%' },
  { name: 'Epic',      count: 300,  multiplier: '3x',    color: '#22c55e', pct: '7%'  },
  { name: 'Legendary', count: 139,  multiplier: '5x',    color: '#3b82f6', pct: '3%'  },
  { name: 'Golden',    count: 5,    multiplier: '100x+', color: '#c9a227', pct: '1%'  },
]

const steps = [
  { num: '01', label: 'Mint a ticket' },
  { num: '02', label: 'Reveal your rarity' },
  { num: '03', label: 'Your multiplier is locked in' },
]

export const RaritySection = () => {
  const tableRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <section className="section-blend px-[15px] py-12 font-sans text-white md:px-[60px] md:py-16">
      <div className="bg-light-bg mb-8 h-[1px] w-full" />

      {/* Top: heading + description left, GIF right */}
      <div className="mb-14 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        {/* Left */}
        <div className="flex-1">
          <h2 className="font-manrope mb-8 text-[36px] font-black leading-[1.05] md:text-[52px]">
            YOUR RARITY.
            <br />
            <span className="text-ticket-red">YOUR MULTIPLIER.</span>
          </h2>

          <div className="max-w-2xl space-y-3">
            <p className="font-manrope text-base leading-[1.75] text-light-text md:text-lg">
              4,444 tickets. 5 rarity tiers. Every ticket maps to future PTSD token
              access. The token is coming. This is how you get in before everyone else.
            </p>
            <p className="font-manrope text-base leading-[1.75] text-light-text">
              Rarity is assigned at mint from the full 4,444 collection. Your presale
              payment locks your spot — the reveal happens when you mint on OpenSea.
              There is no way to choose, only to mint.
            </p>
            <p className="font-manrope text-base leading-[1.75] text-white">
              Even a Common ticket is a ticket. Common = 1x token allocation. That
              alone is the earliest-access path available before the public launch. The
              multiplier is the upside. The allocation is the floor.
            </p>
          </div>
        </div>

        {/* Right: GIF shifted down and left */}
        <div className="flex flex-shrink-0 items-start justify-start lg:w-[42%]">
          <Image
            src="/images/ticket-animated.gif"
            alt="PTSD Show Ticket"
            width={480}
            height={340}
            className="mt-10 w-full max-w-[420px] -translate-x-6 lg:max-w-[480px]"
            unoptimized
          />
        </div>
      </div>

      {/* Full-width rarity table */}
      <div ref={tableRef} className="bg-light-bg mb-16 rounded-2xl p-6 md:p-10">
        <p className="mb-8 font-mono text-xs uppercase tracking-widest text-light-text">
          Rarity System
        </p>
        <div className="space-y-6">
          {rarities.map((r, i) => (
            <div key={r.name} className="flex items-center gap-5">
              <div className="w-28 flex-shrink-0">
                <span
                  className="font-manrope text-sm font-bold md:text-base"
                  style={{ color: r.color }}
                >
                  {r.name}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: animated ? r.pct : '0%',
                      backgroundColor: r.color,
                      transition: `width 0.9s cubic-bezier(0.4, 0, 0.2, 1) ${i * 120}ms`,
                    }}
                  />
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="font-manrope text-sm text-light-text">
                  {r.count.toLocaleString()}
                </span>
              </div>
              <div className="w-16 text-right">
                <span
                  className="font-manrope text-sm font-bold md:text-base"
                  style={{ color: r.color }}
                >
                  {r.multiplier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <p className="mb-6 font-mono text-xs uppercase tracking-widest text-light-text">
        How it works
      </p>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-0">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center gap-3 md:flex-1">
            <span className="font-mono text-sm text-light-text">{step.num}</span>
            <span className="font-manrope text-base font-medium text-white">
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="ml-3 hidden text-light-text md:block">→</span>
            )}
          </div>
        ))}
      </div>
      <p className="font-manrope max-w-2xl text-base leading-[1.75] text-light-text">
        When the PTSD token launches, your ticket determines your allocation tier.
        The higher your rarity, the bigger your token multiplier. No action
        required — your rarity is set at mint.
      </p>
    </section>
  )
}

'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import styles from './TVSection.module.css'

export const TVSection = () => {
  return (
    <section className="w-full bg-[#111]">
      {/*
        Relative container — the <Image> sets its own height (h-auto w-full),
        so percentage coordinates on the overlay always map to the exact same
        spot on the image regardless of viewport width.
      */}
      <div className="relative w-full">
        <Image
          src="/images/tv-bg.png"
          alt="PTSD Show — basement scene with CRT TV"
          width={1200}
          height={675}
          className="block h-auto w-full"
          priority
        />

        {/*
          ╔══════════════════════════════════════════════════════════╗
          ║  ADJUST THESE FOUR VALUES TO ALIGN THE VIDEO            ║
          ║  left / top     → MOVE   the overlay (position)         ║
          ║  width / height → RESIZE the overlay                    ║
          ║                                                          ║
          ║  To measure: open tv-bg.png in any image editor,        ║
          ║  hover each corner of the grey screen, read px coords:  ║
          ║    left%   = left_px   ÷ 1200 × 100                     ║
          ║    top%    = top_px    ÷  675 × 100                     ║
          ║    width%  = width_px  ÷ 1200 × 100                     ║
          ║    height% = height_px ÷  675 × 100                     ║
          ╚══════════════════════════════════════════════════════════╝
        */}
        <div
          className={cn('absolute z-10 overflow-hidden', styles.crtScreen)}
          style={{
            left: '33%',
            top: '37%',
            width: '25%',
            height: '30%',
          }}
        >
          <video
            src="/videos/ptsd-founders.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="block h-full w-full object-cover"
          />
          <div className={styles.scanlines} />
          <div className={styles.vignette} />
        </div>
      </div>
    </section>
  )
}

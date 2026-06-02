'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import styles from './TVSection.module.css'

const openHeroVideo = () => window.dispatchEvent(new CustomEvent('openHeroVideo'))

export const TVSection = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Full-screen looped background video */}
      <video
        src="/videos/hero-loop.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Scanlines */}
      <div className={cn('absolute inset-0 z-10', styles.scanlines)} />

      {/* Vignette */}
      <div className={cn('absolute inset-0 z-10', styles.vignette)} />

      {/* PTSD logo — position matches TV screen center in the video */}
      <button
        onClick={openHeroVideo}
        className={cn('absolute z-20 flex flex-col items-center gap-2', styles.logoButton)}
        style={{ left: '49%', top: '40%', transform: 'translate(-50%, -50%)' }}
        aria-label="Watch PTSD Show"
      >
        <div className={styles.logoGlow}>
          <Image
            src="/images/hero/logo.png"
            alt="PTSD"
            width={200}
            height={200}
            className={cn('object-contain', styles.logoPulse)}
            priority
          />
        </div>
        <span className={styles.playMe}>Play Me</span>
      </button>
    </section>
  )
}

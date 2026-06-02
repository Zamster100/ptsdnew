'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import styles from './styles.module.css'

export const HeroVideo = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 700)

    return () => clearTimeout(t)
  }, [])

  // Allow external components (e.g. TVSection logo button) to open the modal
  useEffect(() => {
    const handler = () => setVisible(true)
    window.addEventListener('openHeroVideo', handler)

    return () => window.removeEventListener('openHeroVideo', handler)
  }, [])

  const close = useCallback(() => setVisible(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center px-4',
        styles.backdrop,
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="relative w-full max-w-6xl">
        {/* Close hint */}
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">
            PTSD Show · Founders Cut
          </span>
          <button
            onClick={close}
            className="font-mono text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:text-white/80"
          >
            [ esc to close ]
          </button>
        </div>

        {/* Video — CRT turn-on */}
        <div
          className={cn(
            'relative overflow-hidden rounded-lg',
            styles.tvContainer,
          )}
          style={{ aspectRatio: '16/9' }}
        >
          <video
            src="/videos/ptsd-founders.mp4"
            autoPlay
            playsInline
            loop
            className="h-full w-full cursor-pointer object-cover"
            onClick={(e) => {
              const v = e.currentTarget
              v.muted = !v.muted
            }}
          />
          <div className={styles.scanlines} />
          <div className={styles.vignette} />
        </div>

        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-white/25">
          Click video to mute
        </p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

const BEAM_RADIUS = 180 // px — adjust to change flashlight size

export const WhyNowSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [pos, setPos] = useState({ x: 50, y: 45 })
  const [inView, setInView] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none)').matches)

    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const showOverlay = inView && !isTouchDevice
  const r = BEAM_RADIUS
  const overlay = isHovering
    ? `radial-gradient(circle at ${pos.x}% ${pos.y}%, transparent 0px, transparent ${r}px, rgba(0,0,0,0.96) ${Math.round(r * 1.65)}px)`
    : 'rgba(0,0,0,0.96)'

  return (
    <section
      ref={sectionRef}
      className="section-blend relative overflow-hidden px-[15px] py-16 font-sans text-white md:px-[60px] md:py-24"
      style={{ background: '#080806' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setPos({ x: 50, y: 45 }) }}
    >
      {/* Flashlight overlay — desktop only */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: overlay,
          opacity: showOverlay ? 1 : 0,
          transition: showOverlay ? 'background 80ms linear, opacity 600ms ease' : 'opacity 600ms ease',
        }}
      />

      {/* Graffiti content */}
      <h2
        className="relative z-10 mx-auto mb-12 max-w-4xl text-center text-[44px] font-black leading-[1.0] md:text-[64px] lg:text-[80px]"
        style={{ transform: 'rotate(-1deg)', fontFamily: 'var(--font-manrope)' }}
      >
        <span
          style={{
            color: '#FFEE00',
            textShadow: '0 0 40px #FFEE00, 0 0 80px rgba(255,238,0,0.3)',
          }}
        >
          THE TOKEN IS COMING.
        </span>
        <br />
        <span
          style={{
            color: '#FF4422',
            textShadow: '0 0 40px #FF4422, 0 0 80px rgba(255,68,34,0.3)',
          }}
        >
          THE TICKET IS HOW YOU GET IN.
        </span>
      </h2>

      <div className="relative z-10 mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
        <p
          className="font-manrope text-base leading-[1.75]"
          style={{ color: '#aaffcc' }}
        >
          The PTSD token is the next chapter. These 4,444 tickets are the only early-access layer before it opens to the wider market.
        </p>
        <p
          className="font-manrope text-base leading-[1.75]"
          style={{ color: '#88ccff' }}
        >
          When the 1,333 spots are gone, you&apos;re in the public queue like everyone else. The people who got in here got in before the queue existed.
        </p>
      </div>
    </section>
  )
}

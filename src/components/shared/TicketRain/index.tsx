'use client'

import { useEffect, useRef } from 'react'

interface Ticket {
  x: number
  y: number
  speed: number
  drift: number
  rotation: number
  rotationSpeed: number
  scale: number
  opacity: number
  delay: number
  started: boolean
  img: number
}

const TICKET_COUNT = 28
const TICKET_W = 90
const TICKET_H = 56
const DEFAULT_IMAGES = ['/images/gold-ticket.png']

interface TicketRainProps {
  /** Ticket artwork; each ticket picks one at random. */
  images?: string[]
  count?: number
  /** Gap between successive ticket spawns. */
  staggerMs?: number
  /** Ticket width at scale 1, in px. */
  baseWidth?: number
  /** Multiplies fall speed. */
  speed?: number
  /** Size tickets from each image's own proportions instead of the fixed 90x56 box. */
  keepAspect?: boolean
}

export const TicketRain = ({
  images = DEFAULT_IMAGES,
  count = TICKET_COUNT,
  staggerMs = 55,
  baseWidth = TICKET_W,
  speed = 1,
  keepAspect = false,
}: TicketRainProps = {}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const ticketsRef = useRef<Ticket[]>([])
  const imgsRef = useRef<HTMLImageElement[]>([])
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    imgsRef.current = images.map(src => {
      const img = new window.Image()
      img.src = src

      return img
    })

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawnTickets = (w: number) => {
      ticketsRef.current = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * (w + 200) - 100,
        y: -baseWidth - Math.random() * 60,
        speed: (1.8 + Math.random() * 2.4) * speed,
        drift: (Math.random() - 0.5) * 0.7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.045,
        scale: 0.4 + Math.random() * 0.5,
        opacity: 0.75 + Math.random() * 0.25,
        delay: i * staggerMs,
        started: false,
        img: Math.floor(Math.random() * images.length),
      }))
    }
    spawnTickets(canvas.offsetWidth)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          spawnTickets(canvas.width || canvas.offsetWidth)
          startTimeRef.current = window.performance.now()
          animate()
        } else {
          window.cancelAnimationFrame(rafRef.current)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(canvas)

    let allDone = false

    const animate = () => {
      const now = window.performance.now()
      const elapsed = now - startTimeRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      allDone = true

      for (const t of ticketsRef.current) {
        if (elapsed < t.delay) {
          allDone = false
          continue
        }
        if (!t.started) t.started = true

        t.y += t.speed
        t.x += t.drift
        t.rotation += t.rotationSpeed

        const fadeStart = canvas.height * 0.75
        const fadeEnd = canvas.height + baseWidth
        const alpha =
          t.y > fadeStart
            ? t.opacity * (1 - (t.y - fadeStart) / (fadeEnd - fadeStart))
            : t.opacity

        if (t.y < fadeEnd) allDone = false
        if (alpha <= 0) continue

        const img = imgsRef.current[t.img]
        if (!img?.complete || !img.naturalWidth) continue

        const w = baseWidth * t.scale
        const h = keepAspect ? w * (img.naturalHeight / img.naturalWidth) : TICKET_H * t.scale

        ctx.save()
        ctx.globalAlpha = Math.max(0, alpha)
        ctx.translate(t.x, t.y)
        ctx.rotate(t.rotation)
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
        ctx.restore()
      }

      if (!allDone) {
        rafRef.current = window.requestAnimationFrame(animate)
      }
    }

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [images, count, staggerMs, baseWidth, speed, keepAspect])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  )
}

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
}

const TICKET_COUNT = 28
const TICKET_W = 90
const TICKET_H = 56

export const TicketRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const ticketsRef = useRef<Ticket[]>([])
  const imgRef = useRef<HTMLImageElement | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = '/images/gold-ticket.png'
    imgRef.current = img

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawnTickets = (w: number) => {
      ticketsRef.current = Array.from({ length: TICKET_COUNT }, (_, i) => ({
        x: Math.random() * (w + 200) - 100,
        y: -TICKET_H - Math.random() * 60,
        speed: 1.8 + Math.random() * 2.4,
        drift: (Math.random() - 0.5) * 0.7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.045,
        scale: 0.4 + Math.random() * 0.5,
        opacity: 0.75 + Math.random() * 0.25,
        delay: i * 55,
        started: false,
      }))
    }
    spawnTickets(canvas.offsetWidth)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          spawnTickets(canvas.width || canvas.offsetWidth)
          startTimeRef.current = performance.now()
          animate()
        } else {
          cancelAnimationFrame(rafRef.current)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(canvas)

    let allDone = false

    const animate = () => {
      const now = performance.now()
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
        const fadeEnd = canvas.height + TICKET_H
        const alpha =
          t.y > fadeStart
            ? t.opacity * (1 - (t.y - fadeStart) / (fadeEnd - fadeStart))
            : t.opacity

        if (t.y < fadeEnd) allDone = false
        if (alpha <= 0) continue

        const w = TICKET_W * t.scale
        const h = TICKET_H * t.scale

        ctx.save()
        ctx.globalAlpha = Math.max(0, alpha)
        ctx.translate(t.x, t.y)
        ctx.rotate(t.rotation)
        if (imgRef.current?.complete) {
          ctx.drawImage(imgRef.current, -w / 2, -h / 2, w, h)
        }
        ctx.restore()
      }

      if (!allDone) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    img.onload = () => {
      // image ready; animation starts via observer
    }

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  )
}

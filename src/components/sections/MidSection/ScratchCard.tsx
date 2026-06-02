'use client'

import { useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import styles from './ScratchCard.module.css'

interface ScratchCardProps {
  imageSrc: string
  alt?: string
}

const CANVAS_W = 800
const CANVAS_H = 500

function getPosOnCanvas(
  e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_W / rect.width
  const scaleY = CANVAS_H / rect.height
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
    radius: 30 * scaleX,
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D) {
  // Gold metallic gradient
  const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
  grad.addColorStop(0, '#5a3d00')
  grad.addColorStop(0.25, '#a07010')
  grad.addColorStop(0.5, '#d4a827')
  grad.addColorStop(0.75, '#a07010')
  grad.addColorStop(1, '#5a3d00')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Horizontal line texture
  ctx.strokeStyle = 'rgba(255,220,100,0.2)'
  ctx.lineWidth = 1
  for (let y = 0; y < CANVAS_H; y += 3) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_W, y)
    ctx.stroke()
  }

  // Scratchy diagonal marks
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * CANVAS_W
    const y = Math.random() * CANVAS_H
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 20 + Math.random() * 40, y + 4 + Math.random() * 10)
    ctx.stroke()
  }

  // Central text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 8

  ctx.font = `bold ${Math.round(CANVAS_W * 0.055)}px sans-serif`
  ctx.fillStyle = 'rgba(80,50,0,0.75)'
  ctx.fillText('SCRATCH TO REVEAL', CANVAS_W / 2, CANVAS_H / 2 - 14)

  ctx.font = `${Math.round(CANVAS_W * 0.025)}px sans-serif`
  ctx.fillStyle = 'rgba(60,40,0,0.55)'
  ctx.fillText('drag to scratch', CANVAS_W / 2, CANVAS_H / 2 + 26)

  ctx.shadowBlur = 0
}

export const ScratchCard = ({ imageSrc, alt = '' }: ScratchCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const scratchEvents = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawOverlay(ctx)
  }, [])

  const autoReveal = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data
    let transparent = 0
    const step = 40
    const total = Math.floor(data.length / (4 * step))
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] < 128) transparent++
    }

    if (transparent / total > 0.6) {
      canvas.style.transition = 'opacity 0.7s ease'
      canvas.style.opacity = '0'
      setTimeout(() => {
        if (canvas) canvas.style.display = 'none'
      }, 700)
    }
  }, [])

  const handleScratch = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { x, y, radius } = getPosOnCanvas(e, canvas)

      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'

      scratchEvents.current++
      if (scratchEvents.current % 12 === 0) autoReveal()
    },
    [autoReveal],
  )

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ aspectRatio: '16/10' }}
    >
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className="object-cover"
        quality={95}
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: 'crosshair' }}
        onMouseDown={() => {
          isDrawing.current = true
        }}
        onMouseUp={() => {
          isDrawing.current = false
        }}
        onMouseLeave={() => {
          isDrawing.current = false
        }}
        onMouseMove={handleScratch}
        onTouchStart={(e) => {
          e.preventDefault()
          isDrawing.current = true
        }}
        onTouchEnd={() => {
          isDrawing.current = false
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          handleScratch(e)
        }}
      />
      {/* Moving sheen over the whole card */}
      <div className={styles.shimmer} />
    </div>
  )
}

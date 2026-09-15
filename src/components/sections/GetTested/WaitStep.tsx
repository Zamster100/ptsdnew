'use client'

import { useEffect, useRef, useState } from 'react'

interface WaitStepProps {
  apiDone: boolean
  handle: string
  onComplete: () => void
}

const STATUS_MESSAGES = [
  'Scanning timeline...',
  'Cross-referencing your worst calls...',
  'Checking for cope...',
  'Reading between the lines...',
  'Calculating trauma index...',
]

const STATUS_INTERVAL_MS = 4000
const SLOW_WARNING_MS = 60_000

export const WaitStep = ({ apiDone, handle, onComplete }: WaitStepProps) => {
  const [videoEnded, setVideoEnded] = useState(false)
  const [skipClicked, setSkipClicked] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [slow, setSlow] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const completedRef = useRef(false)

  // Analysis bar keeps cycling for the entire screen, independent of
  // whatever the video is doing.
  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex(i => (i + 1) % STATUS_MESSAGES.length)
    }, STATUS_INTERVAL_MS)

    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_WARNING_MS)

    return () => clearTimeout(id)
  }, [])

  // Advance only once both the video (ended or skipped) and the API are
  // done — default behavior is to let the video finish before moving on.
  useEffect(() => {
    if (completedRef.current) return
    if (apiDone && (videoEnded || skipClicked)) {
      completedRef.current = true
      onComplete()
    }
  }, [apiDone, videoEnded, skipClicked, onComplete])

  // Try to autoplay with sound; if the browser blocks that, fall back to muted.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {
      v.muted = true
      v.play().catch(() => {})
    })
  }, [])

  const waitingForApi = (videoEnded || skipClicked) && !apiDone

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
      <div className="flex h-[75vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        {/* Analysis bar — always visible, always animating */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-black px-5 py-4 md:px-8">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ticket-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ticket-red" />
          </span>
          <p className="font-mono text-xs uppercase tracking-widest text-white md:text-sm">
            {STATUS_MESSAGES[statusIndex]}
          </p>
          {slow && !apiDone && (
            <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-white/40">
              Taking longer than expected...
            </span>
          )}
        </div>

        {/* Video */}
        <div className="relative flex-1 bg-black">
          {!waitingForApi && (
            <video
              ref={videoRef}
              src="/videos/ptsd-founders.mp4"
              playsInline
              onEnded={() => setVideoEnded(true)}
              className="h-full w-full object-cover"
            />
          )}

          {waitingForApi && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-ticket-red" />
              <p className="font-mono text-xs uppercase tracking-widest text-white/50">
                Almost there...
              </p>
            </div>
          )}

          {/* Red analysis overlay — tint + border to make it unmistakable
              that a live scan is running over the footage. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-ticket-red/15 mix-blend-multiply" />
            <div className="absolute inset-0 border-4 border-ticket-red/40" />
          </div>

          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-ticket-red/50 bg-black/70 px-3 py-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ticket-red opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ticket-red" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white md:text-xs">
              Analyzing{handle ? ` @${handle}` : ' profile'}...
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSkipClicked(true)}
            className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:border-white/40"
          >
            Skip
          </button>

          {!waitingForApi && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-4 pt-12 md:px-8">
              <p className="font-mono text-xs uppercase tracking-widest text-white md:text-sm">
                Analyzing posts and preparing diagnosis — enjoy this while you wait
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LeaderboardRow {
  id: number
  handle: string
  traumaIndex: number
  band: string
  resultType: string
  createdAt: string
}

interface LeaderboardProps {
  myId?: number
}

export const Leaderboard = ({ myId }: LeaderboardProps) => {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/get-tested/leaderboard?limit=50')
      .then(res => res.json())
      .then(json => {
        if (!cancelled) setRows(json.patients ?? [])
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto mt-16 w-full max-w-2xl">
      <p className="mb-2 text-center font-mono text-xs uppercase tracking-widest text-main-red">
        Most Afflicted
      </p>
      <h3 className="font-manrope mb-8 text-center text-2xl font-black text-white md:text-3xl">
        THE LEADERBOARD.
      </h3>

      {error && (
        <p className="text-center font-mono text-xs text-white/30">
          Couldn't load the leaderboard. Try again shortly.
        </p>
      )}

      {!error && rows === null && (
        <p className="text-center font-mono text-xs text-white/30">Loading…</p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="text-center font-mono text-xs text-white/30">No patients on file yet.</p>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">#</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">Handle</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">Type</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/25 text-right">
              Index
            </span>
          </div>
          {rows.map((row, i) => (
            <div
              key={row.id}
              className={cn(
                'grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 px-4 py-3',
                row.id === myId && 'bg-ticket-red/10',
              )}
            >
              <span className="font-mono text-xs text-white/50">{i + 1}</span>
              <span className="font-manrope truncate text-sm font-medium text-white">
                {row.handle}
              </span>
              <span className="font-mono text-xs text-white/50">{row.resultType}</span>
              <span className="font-mono text-xs font-bold text-right text-white">
                {row.traumaIndex.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

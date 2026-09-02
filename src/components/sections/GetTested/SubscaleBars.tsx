'use client'

import { useEffect, useState } from 'react'
import { CLUSTERS, CLUSTER_ORDER } from '@/lib/getTested/data'
import { ClusterId } from '@/lib/getTested/types'

interface SubscaleBarsProps {
  clusterScores: Record<ClusterId, number>
}

const MAX_CLUSTER_SCORE = 8

export const SubscaleBars = ({ clusterScores }: SubscaleBarsProps) => {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 10)

    return () => clearTimeout(id)
  }, [])

  return (
    <div className="space-y-3">
      {CLUSTER_ORDER.map((clusterId, i) => {
        const cluster = CLUSTERS[clusterId]
        const score = clusterScores[clusterId]
        const pct = (score / MAX_CLUSTER_SCORE) * 100

        return (
          <div key={clusterId} className="flex items-center gap-3">
            <span className="w-4 shrink-0 font-mono text-[11px] font-bold text-white/50">
              {clusterId}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: animated ? `${pct}%` : '0%',
                  backgroundColor: cluster.color,
                  transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 100}ms`,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[11px] text-white/50">
              {score}
            </span>
          </div>
        )
      })}
    </div>
  )
}

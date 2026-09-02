import { CLUSTER_ORDER, CLUSTERS, ITEMS } from '@/lib/getTested/data'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  answers: (number | null)[]
  currentIndex: number
}

const CLUSTER_ITEM_INDEXES = CLUSTER_ORDER.reduce(
  (acc, clusterId) => {
    acc[clusterId] = ITEMS.reduce<number[]>((idx, item, i) => {
      if (item.cluster === clusterId) idx.push(i)

      return idx
    }, [])

    return acc
  },
  {} as Record<string, number[]>,
)

export const ProgressBar = ({ answers, currentIndex }: ProgressBarProps) => {
  const intakeDone = Math.min(currentIndex, 2)
  const itemAnswers = answers.slice(2)
  const currentClusterId = currentIndex >= 2 ? ITEMS[currentIndex - 2]?.cluster : undefined

  return (
    <div className="mb-8 mt-6 w-full">
      {/* Intake progress */}
      <div className="mb-5 flex gap-1.5">
        {[0, 1].map(i => (
          <div
            key={i}
            className={cn('h-1 flex-1 rounded-full', i < intakeDone ? 'bg-main-yellow' : 'bg-white/10')}
          />
        ))}
      </div>

      {/* Cluster labels — the 5 categories, ported from the ptsd25.html cluster bar */}
      <div className="mb-3 flex gap-3">
        {CLUSTER_ORDER.map(clusterId => {
          const cluster = CLUSTERS[clusterId]
          const indexes = CLUSTER_ITEM_INDEXES[clusterId]
          const isDone = indexes.every(i => itemAnswers[i] !== null && itemAnswers[i] !== undefined)
          const isActive = currentClusterId === clusterId

          return (
            <div key={clusterId} className="min-w-0 flex-1">
              <p
                className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.1em] md:text-[10px]"
                style={{ color: isActive ? cluster.color : isDone ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)' }}
              >
                {clusterId} · {cluster.name}
              </p>
              <div
                className="mt-2 h-[3px] w-full rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: isActive
                    ? cluster.color
                    : isDone
                      ? 'rgba(255,255,255,0.3)'
                      : 'rgba(255,255,255,0.1)',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Item ticks */}
      <div className="flex gap-[3px]">
        {ITEMS.map((item, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                itemAnswers[i] !== null && itemAnswers[i] !== undefined
                  ? CLUSTERS[item.cluster].color
                  : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

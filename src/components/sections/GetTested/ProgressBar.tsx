import { cn } from '@/lib/utils'
import { CLUSTER_ORDER, CLUSTERS, ITEMS } from '@/lib/getTested/data'

interface ProgressBarProps {
  answers: (number | null)[]
  currentIndex: number
}

export const ProgressBar = ({ answers, currentIndex }: ProgressBarProps) => {
  const intakeDone = Math.min(currentIndex, 2)
  const itemAnswers = answers.slice(2)

  return (
    <div className="mb-10 w-full">
      {/* Intake progress */}
      <div className="mb-3 flex gap-1.5">
        {[0, 1].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i < intakeDone ? 'bg-main-yellow' : 'bg-white/10',
            )}
          />
        ))}
      </div>

      {/* Cluster segments */}
      <div className="mb-3 flex gap-1.5">
        {CLUSTER_ORDER.map(clusterId => {
          const clusterItemIndexes = ITEMS.reduce<number[]>((acc, item, i) => {
            if (item.cluster === clusterId) acc.push(i)

            return acc
          }, [])
          const answeredCount = clusterItemIndexes.filter(i => itemAnswers[i] !== null && itemAnswers[i] !== undefined).length
          const fillPct = (answeredCount / clusterItemIndexes.length) * 100

          return (
            <div key={clusterId} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${fillPct}%`, backgroundColor: CLUSTERS[clusterId].color }}
              />
            </div>
          )
        })}
      </div>

      {/* Item ticks */}
      <div className="flex gap-[3px]">
        {ITEMS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-[3px] flex-1 rounded-full',
              itemAnswers[i] !== null && itemAnswers[i] !== undefined ? 'bg-white/70' : 'bg-white/10',
            )}
          />
        ))}
      </div>
    </div>
  )
}

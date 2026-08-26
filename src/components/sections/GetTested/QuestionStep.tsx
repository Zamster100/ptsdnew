import { cn } from '@/lib/utils'
import { RESPONSE_SCALE, CLUSTERS, CLUSTER_TEXT_CLASS } from '@/lib/getTested/data'
import { Step } from '@/lib/getTested/types'

interface QuestionStepProps {
  step: Step
  selected: number | null
  onSelect: (index: number) => void
}

export const QuestionStep = ({ step, selected, onSelect }: QuestionStepProps) => {
  const isItem = step.type === 'item'
  const cluster = isItem ? CLUSTERS[step.cluster] : null
  const options = isItem ? RESPONSE_SCALE : step.options
  const questionText = isItem ? step.text : step.question

  return (
    <div className="w-full">
      {cluster ? (
        <div className="mb-6">
          <p
            className={cn(
              'mb-2 font-mono text-xs font-bold uppercase tracking-widest',
              CLUSTER_TEXT_CLASS[cluster.id],
            )}
          >
            Cluster {cluster.id} · {cluster.name}
          </p>
          <p className="font-manrope text-sm italic text-light-text">{cluster.tagline}</p>
        </div>
      ) : (
        <p className="mb-6 font-mono text-xs font-bold uppercase tracking-widest text-main-yellow">
          Intake
        </p>
      )}

      <h2 className="font-manrope mb-10 text-2xl font-black leading-[1.3] text-white md:text-[32px]">
        {questionText}
      </h2>

      <div className="flex flex-col gap-3">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              'font-manrope w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition-colors duration-150 md:text-base',
              selected === i
                ? 'border-ticket-red bg-ticket-red/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-light-text hover:border-white/25 hover:text-white',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'

type Stage = 'intake' | 'wait' | 'result' | 'spread' | 'claim' | 'confirmation'

interface StepperProps {
  currentStage: Stage
}

const ALL_STAGES: Stage[] = ['intake', 'wait', 'result', 'spread', 'claim', 'confirmation']

const STEPS = [
  { n: 1, label: 'Diagnose', stages: ['intake', 'wait', 'result'] as Stage[] },
  { n: 2, label: 'Spread the Signal', stages: ['spread'] as Stage[] },
  { n: 3, label: 'Your Coordinates', stages: ['claim'] as Stage[] },
]

function statusFor(stepStages: Stage[], currentStage: Stage): 'done' | 'active' | 'upcoming' {
  if (currentStage === 'confirmation') return 'done'

  const currentIdx = ALL_STAGES.indexOf(currentStage)
  const stepIndices = stepStages.map(s => ALL_STAGES.indexOf(s))
  const stepMinIdx = Math.min(...stepIndices)
  const stepMaxIdx = Math.max(...stepIndices)

  if (currentIdx > stepMaxIdx) return 'done'
  if (currentIdx >= stepMinIdx) return 'active'

  return 'upcoming'
}

export const Stepper = ({ currentStage }: StepperProps) => (
  <div className="mb-8 flex items-center">
    {STEPS.map((step, i) => {
      const status = statusFor(step.stages, currentStage)

      return (
        <div key={step.n} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold transition-colors',
                status === 'done' && 'border-ticket-red bg-ticket-red text-white',
                status === 'active' && 'border-ticket-red bg-transparent text-ticket-red',
                status === 'upcoming' && 'border-white/20 bg-transparent text-white/30',
              )}
            >
              {status === 'done' ? '✓' : String(step.n).padStart(2, '0')}
            </div>
            <span
              className={cn(
                'hidden whitespace-nowrap font-mono text-[9px] uppercase tracking-widest md:block',
                status === 'upcoming' ? 'text-white/30' : 'text-white/70',
              )}
            >
              {step.label}
            </span>
          </div>

          {i < STEPS.length - 1 && (
            <div
              className={cn('mx-2 h-px flex-1 transition-colors', status === 'done' ? 'bg-ticket-red' : 'bg-white/15')}
            />
          )}
        </div>
      )
    })}
  </div>
)

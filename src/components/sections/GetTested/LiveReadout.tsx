import { CLUSTERS } from '@/lib/getTested/data'
import { computePartialRawScore } from '@/lib/getTested/scoring'
import { Step } from '@/lib/getTested/types'

interface LiveReadoutProps {
  answers: (number | null)[]
  currentStep: Step
}

export const LiveReadout = ({ answers, currentStep }: LiveReadoutProps) => {
  const rawSoFar = computePartialRawScore(answers.slice(2))
  const accentColor = currentStep.type === 'item' ? CLUSTERS[currentStep.cluster].color : 'var(--color-main-yellow)'

  return (
    <div className="mb-8 flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
      <span className="text-white/40">Live Readout</span>
      <span className="tabular-nums font-bold" style={{ color: accentColor }}>
        {rawSoFar}
      </span>
      <span className="text-white/20">/ 40</span>
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { STEPS, INTAKE_QUESTIONS, CLUSTERS } from '@/lib/getTested/data'
import { computePartialRawScore, getPrimaryClusterColor } from '@/lib/getTested/scoring'
import { BandId, ClusterId } from '@/lib/getTested/types'
import { IntroStep } from './IntroStep'
import { QuestionStep } from './QuestionStep'
import { ProgressBar } from './ProgressBar'
import { LiveReadout } from './LiveReadout'
import { EkgStrip } from './EkgStrip'
import { Masthead } from './Masthead'
import { ResultCard } from './ResultCard'
import { MalingeringBanner } from './MalingeringBanner'
import { OffRampNotice } from './OffRampNotice'
import { DownloadButton } from './DownloadButton'
import { Leaderboard } from './Leaderboard'

type Stage = 'intro' | 'quiz' | 'result'

interface SubmitResult {
  id: number
  clusterScores: Record<ClusterId, number>
  rawScore: number
  traumaIndex: number
  band: BandId
  bandLabel: string
  bandCopy: string
  resultType: string
  typeLine: string
  malingering: boolean
}

const TOTAL_STEPS = STEPS.length
const DEFAULT_EKG_COLOR = 'var(--color-main-red)'

export const QuizFlow = () => {
  const [stage, setStage] = useState<Stage>('intro')
  const [handle, setHandle] = useState('')
  const [answers, setAnswers] = useState<(number | null)[]>(Array(TOTAL_STEPS).fill(null))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)

  function handleBegin(h: string) {
    setHandle(h)
    setStage('quiz')
  }

  async function submit(finalAnswers: (number | null)[]) {
    setSubmitting(true)
    setError(null)
    try {
      const cycle = INTAKE_QUESTIONS[0].options[finalAnswers[0]!]
      const worst = INTAKE_QUESTIONS[1].options[finalAnswers[1]!]
      const itemAnswers = finalAnswers.slice(2) as number[]

      const res = await fetch('/api/get-tested/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, cycle, worst, answers: itemAnswers }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Try again.')

        return
      }

      setResult(json)
      setStage('result')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSelect(optionIndex: number) {
    const next = [...answers]
    next[currentIndex] = optionIndex
    setAnswers(next)

    if (currentIndex === TOTAL_STEPS - 1) {
      submit(next)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function handleBack() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  function handleRetake() {
    setStage('intro')
    setAnswers(Array(TOTAL_STEPS).fill(null))
    setCurrentIndex(0)
    setResult(null)
    setError(null)
  }

  // EKG trace runs behind every stage — color follows the current cluster
  // (or the dominant cluster on the result), speed picks up as the live
  // score climbs, same behavior as the ptsd25.html prototype it's ported from.
  const rawSoFar = computePartialRawScore(answers.slice(2))
  const ekgSpeed = Math.max(0.5, 1.7 - (rawSoFar / 40) * 1.1)

  let ekgColor = DEFAULT_EKG_COLOR
  const currentStep = stage === 'quiz' ? STEPS[currentIndex] : null
  if (currentStep?.type === 'item') {
    ekgColor = CLUSTERS[currentStep.cluster].color
  } else if (stage === 'result' && result) {
    ekgColor = getPrimaryClusterColor(result.clusterScores)
  }

  const deck =
    stage === 'intro'
      ? "12 questions. 5 clusters. One number you can't unsee. Find out exactly how held, hunted, and haunted you really are."
      : stage === 'quiz'
        ? "Over the last 30 days, how often have you experienced the following? The chart doesn't lie and neither should you."
        : 'Diagnosis confirmed. Chart closed.'

  return (
    <div className="mx-auto w-full max-w-2xl px-[15px] pb-24 pt-28 md:px-[60px]">
      <Masthead title="The PTSD-25" deck={deck} liveValue={rawSoFar} accentColor={ekgColor} />
      <EkgStrip color={ekgColor} speedSeconds={ekgSpeed} />
      <ProgressBar answers={answers} currentIndex={stage === 'result' ? TOTAL_STEPS : currentIndex} />

      <div className="mt-10">
        {stage === 'intro' && <IntroStep onBegin={handleBegin} />}

        {stage === 'quiz' && currentStep && (
          <div>
            <div className="mb-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/30">
              <span>
                {currentIndex + 1} / {TOTAL_STEPS}
              </span>
              {currentIndex > 0 && (
                <button type="button" onClick={handleBack} className="text-white/40 hover:text-white/70">
                  ← Back
                </button>
              )}
            </div>

            <LiveReadout answers={answers} currentStep={currentStep} />
            <QuestionStep step={currentStep} selected={answers[currentIndex]} onSelect={handleSelect} />

            {submitting && (
              <p className="mt-6 text-center font-mono text-xs text-white/40">Running diagnostics…</p>
            )}
            {error && <p className="mt-6 text-center font-mono text-xs text-ticket-red">{error}</p>}
          </div>
        )}

        {stage === 'result' && result && (
          <div className="flex flex-col items-center">
            {result.malingering && <MalingeringBanner />}

            <p className="font-manrope mb-8 max-w-md text-center text-sm leading-[1.6] text-light-text">
              {result.bandCopy}
            </p>

            <ResultCard
              ref={cardRef}
              patientNo={String(result.id).padStart(6, '0')}
              handle={handle}
              cycle={INTAKE_QUESTIONS[0].options[answers[0]!]}
              worst={INTAKE_QUESTIONS[1].options[answers[1]!]}
              result={result}
            />

            <div className="mt-6 flex w-full max-w-lg gap-3">
              <DownloadButton
                targetRef={cardRef}
                filename={`ptsd25-patient-${String(result.id).padStart(6, '0')}.png`}
                className="flex-1"
              />
              <Button variant="outline" className="flex-1 justify-center" onClick={handleRetake}>
                Retake
              </Button>
            </div>

            <OffRampNotice />

            <Leaderboard myId={result.id} />
          </div>
        )}
      </div>
    </div>
  )
}

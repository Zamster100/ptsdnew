'use client'

import { useEffect, useRef, useState } from 'react'
import { getTypeAccent, SpreadTaskId } from '@/lib/getTested/data'
import { getRandomPatientPhoto } from '@/lib/getTested/photos'
import { DiagnosisResult } from '@/lib/getTested/types'
import { loadFlowState, saveFlowState } from '@/lib/getTested/storage'
import { IntroStep } from './IntroStep'
import { WaitStep } from './WaitStep'
import { ResultStep } from './ResultStep'
import { SpreadStep } from './SpreadStep'
import { ClaimStep } from './ClaimStep'
import { ConfirmationStep } from './ConfirmationStep'
import { EkgStrip } from './EkgStrip'
import { Masthead } from './Masthead'
import { Stepper } from './Stepper'

type Stage = 'intake' | 'wait' | 'result' | 'spread' | 'claim' | 'confirmation'

const DEFAULT_EKG_COLOR = 'var(--color-main-red)'

export const DiagnosisFlow = () => {
  const [stage, setStage] = useState<Stage>('intake')
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [handle, setHandle] = useState('')
  const [openedTasks, setOpenedTasks] = useState<SpreadTaskId[]>([])

  const cardRef = useRef<HTMLDivElement>(null)
  const apiDone = result !== null || apiError !== null

  // Resume from localStorage — only for stages reached AFTER the Grok call
  // already completed (result/claim/confirmation). A refresh during
  // intake/wait just restarts, since the in-flight request is gone anyway.
  useEffect(() => {
    const saved = loadFlowState()
    if (saved) {
      setResult(saved.result)
      setShared(saved.shared)
      setOpenedTasks(saved.openedTasks)
      setStage(saved.stage)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !result) return
    if (stage === 'result' || stage === 'spread' || stage === 'claim' || stage === 'confirmation') {
      saveFlowState({ stage, result, shared, openedTasks })
    }
  }, [hydrated, stage, result, shared, openedTasks])

  async function handleBegin(h: string) {
    setResult(null)
    setApiError(null)
    setHandle(h)
    setStage('wait')

    try {
      const res = await fetch('/api/get-tested/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: h }),
      })
      const json = await res.json()

      if (!res.ok) {
        setApiError(json.error ?? 'Something went wrong. Try again.')

        return
      }

      setResult({ ...json, photoUrl: getRandomPatientPhoto(json.type) })
    } catch {
      setApiError('Network error — please try again.')
    }
  }

  function handleWaitComplete() {
    setStage(apiError ? 'intake' : 'result')
  }

  function handleContinueFromResult() {
    setStage('spread')
  }

  function handleTaskOpened(taskId: SpreadTaskId) {
    setOpenedTasks(prev => (prev.includes(taskId) ? prev : [...prev, taskId]))
  }

  function handleSpreadComplete() {
    setShared(true)
    setStage('claim')
  }

  function handleClaimed() {
    setStage('confirmation')
  }

  const ekgColor = result && stage !== 'intake' && stage !== 'wait' ? getTypeAccent(result.type) : DEFAULT_EKG_COLOR
  const ekgSpeed = stage === 'wait' ? 0.6 : 1.7

  const deck =
    stage === 'intake'
      ? 'One handle. We analyze your actual posts and tell you exactly how held, hunted, and haunted you really are.'
      : stage === 'wait'
        ? 'Reading the chart. This part is not simulated.'
        : stage === 'result'
          ? 'Diagnosis confirmed. Chart closed.'
          : stage === 'spread'
            ? 'Every diagnosis is contagious. Spread yours before you claim your spot.'
            : stage === 'claim'
              ? 'Last step before your spot is locked in.'
              : 'Processed. Filed. Pending review.'

  if (!hydrated) return null

  return (
    <div className="mx-auto w-full max-w-5xl px-[15px] pb-24 pt-28 md:px-[60px]">
      <Masthead deck={deck} />
      <Stepper currentStage={stage} />
      <EkgStrip color={ekgColor} speedSeconds={ekgSpeed} />

      <div className="mt-10">
        {stage === 'intake' && (
          <div>
            <IntroStep onBegin={handleBegin} />
            {apiError && (
              <p className="mt-6 text-center font-mono text-xs text-ticket-red">{apiError}</p>
            )}
          </div>
        )}

        {stage === 'wait' && (
          <WaitStep apiDone={apiDone} handle={handle} onComplete={handleWaitComplete} />
        )}

        {stage === 'result' && result && (
          <ResultStep result={result} cardRef={cardRef} onContinue={handleContinueFromResult} />
        )}

        {stage === 'spread' && result && (
          <SpreadStep openedTasks={openedTasks} onTaskOpened={handleTaskOpened} onContinue={handleSpreadComplete} />
        )}

        {stage === 'claim' && result && (
          <ClaimStep diagnosisId={result.id} onClaimed={handleClaimed} />
        )}

        {stage === 'confirmation' && result && <ConfirmationStep patientNo={result.patientNo} />}
      </div>
    </div>
  )
}

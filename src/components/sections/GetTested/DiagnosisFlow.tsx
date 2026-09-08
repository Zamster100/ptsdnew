'use client'

import { useEffect, useRef, useState } from 'react'
import { getTypeAccent } from '@/lib/getTested/data'
import { DiagnosisResult } from '@/lib/getTested/types'
import { loadFlowState, saveFlowState } from '@/lib/getTested/storage'
import { IntroStep } from './IntroStep'
import { WaitStep } from './WaitStep'
import { ResultStep } from './ResultStep'
import { ClaimStep } from './ClaimStep'
import { ConfirmationStep } from './ConfirmationStep'
import { EkgStrip } from './EkgStrip'
import { Masthead } from './Masthead'

type Stage = 'intake' | 'wait' | 'result' | 'claim' | 'confirmation'

const DEFAULT_EKG_COLOR = 'var(--color-main-red)'

export const DiagnosisFlow = () => {
  const [stage, setStage] = useState<Stage>('intake')
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [hydrated, setHydrated] = useState(false)

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
      setStage(saved.stage)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !result) return
    if (stage === 'result' || stage === 'claim' || stage === 'confirmation') {
      saveFlowState({ stage, result, shared })
    }
  }, [hydrated, stage, result, shared])

  async function handleBegin(h: string) {
    setResult(null)
    setApiError(null)
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

      setResult(json)
    } catch {
      setApiError('Network error — please try again.')
    }
  }

  function handleWaitComplete() {
    setStage(apiError ? 'intake' : 'result')
  }

  function handleShared() {
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
      ? 'One handle. Grok reads your actual posts and tells you exactly how held, hunted, and haunted you really are.'
      : stage === 'wait'
        ? 'Reading the chart. This part is not simulated.'
        : stage === 'result'
          ? 'Diagnosis confirmed. Chart closed.'
          : stage === 'claim'
            ? 'Last step before your spot is locked in.'
            : 'Processed. Filed. Pending review.'

  if (!hydrated) return null

  return (
    <div className="mx-auto w-full max-w-5xl px-[15px] pb-24 pt-28 md:px-[60px]">
      <Masthead deck={deck} />
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

        {stage === 'wait' && <WaitStep apiDone={apiDone} onComplete={handleWaitComplete} />}

        {stage === 'result' && result && (
          <ResultStep result={result} cardRef={cardRef} onShared={handleShared} />
        )}

        {stage === 'claim' && result && (
          <ClaimStep diagnosisId={result.id} onClaimed={handleClaimed} />
        )}

        {stage === 'confirmation' && result && <ConfirmationStep patientNo={result.patientNo} />}
      </div>
    </div>
  )
}

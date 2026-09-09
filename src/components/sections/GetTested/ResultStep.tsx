'use client'

import { RefObject, useState } from 'react'
import { toBlob } from 'html-to-image'
import { DiagnosisResult } from '@/lib/getTested/types'
import { getBandLabel } from '@/lib/getTested/scoring'
import { ResultCard } from './ResultCard'
import { DownloadButton } from './DownloadButton'
import { OffRampNotice } from './OffRampNotice'

interface ResultStepProps {
  result: DiagnosisResult
  cardRef: RefObject<HTMLDivElement | null>
  onContinue: () => void
}

const buttonClass =
  'font-manrope flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-bold text-white transition-colors duration-150 hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50'

export const ResultStep = ({ result, cardRef, onContinue }: ResultStepProps) => {
  const [copyState, setCopyState] = useState<'idle' | 'busy' | 'copied' | 'failed'>('idle')

  async function handleCopyImage() {
    if (!cardRef.current || copyState === 'busy') return
    setCopyState('busy')
    try {
      if (document.fonts?.ready) await document.fonts.ready

      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard image write not supported in this browser')
      }

      const blob = await toBlob(cardRef.current, { pixelRatio: 2 })
      if (!blob) throw new Error('Failed to render card image')

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch (err) {
      console.error('[get-tested] copy image failed:', err)
      setCopyState('failed')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  function handlePostToX() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ptsdshow.com'
    const text = `I just got diagnosed on PTSD-25: ${result.type}. Trauma Index ${result.traumaIndex.toLocaleString()}/9001 (${getBandLabel(result.band)}). Get tested:`
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${siteUrl}/get-tested`)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col items-center">
      <ResultCard ref={cardRef} result={result} />

      <p className="font-manrope mt-8 text-center text-sm font-bold uppercase tracking-wide text-main-yellow">
        Chart&apos;s open. Next: spread it.
      </p>

      <div className="mt-4 flex w-full max-w-lg gap-3">
        <DownloadButton
          targetRef={cardRef}
          filename={`ptsd25-${result.handle}.png`}
          className={buttonClass}
        />

        <button type="button" onClick={handlePostToX} className={buttonClass}>
          Post to X
        </button>

        <button type="button" onClick={handleCopyImage} disabled={copyState === 'busy'} className={buttonClass}>
          {copyState === 'busy' && 'Copying…'}
          {copyState === 'copied' && 'Copied!'}
          {copyState === 'failed' && "Couldn't copy"}
          {copyState === 'idle' && 'Copy Image'}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="font-manrope mt-6 w-full max-w-lg rounded-xl bg-ticket-red px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Continue to Spread the Signal
      </button>

      <OffRampNotice />
    </div>
  )
}

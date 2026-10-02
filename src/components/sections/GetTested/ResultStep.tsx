'use client'

import { RefObject, useEffect, useState } from 'react'
import { toBlob } from 'html-to-image'
import { cn } from '@/lib/utils'
import { CAMPAIGN_TWEET_URL } from '@/lib/getTested/data'
import { DiagnosisResult } from '@/lib/getTested/types'
import { ResultCard } from './ResultCard'
import { DownloadButton } from './DownloadButton'
import { OffRampNotice } from './OffRampNotice'

interface ResultStepProps {
  result: DiagnosisResult
  cardRef: RefObject<HTMLDivElement | null>
  onContinue: () => void
}

export const ResultStep = ({ result, cardRef, onContinue }: ResultStepProps) => {
  const [copyState, setCopyState] = useState<'idle' | 'busy' | 'copied' | 'failed'>('idle')
  const [qrtOpened, setQrtOpened] = useState(false)
  const [qrtDone, setQrtDone] = useState(false)

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

  const SHARE_TEXTS = [
    'I just took the PTSD diagnosis from @ptsdshow. The doctor said "how long have you been like this?" I said "since the top."',
    '@ptsdshow diagnosed me. Symptoms include checking charts at 3am and calling it research. Prognosis: more of the same.',
    'Took the PTSD test from @ptsdshow. It read my whole personality off my portfolio. Rude, but accurate.',
  ]

  function handleQuoteRetweet() {
    const text = SHARE_TEXTS[Math.floor(Math.random() * SHARE_TEXTS.length)]
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(CAMPAIGN_TWEET_URL)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
    setQrtOpened(true)
  }

  // X can't confirm the post from here, so like the spread tasks this is honor-system: the
  // gate opens once the user comes back to this tab after opening the quote-retweet window.
  useEffect(() => {
    if (!qrtOpened || qrtDone) return
    function handleReturn() {
      if (document.visibilityState === 'visible') setQrtDone(true)
    }
    document.addEventListener('visibilitychange', handleReturn)
    window.addEventListener('focus', handleReturn)
    
return () => {
      document.removeEventListener('visibilitychange', handleReturn)
      window.removeEventListener('focus', handleReturn)
    }
  }, [qrtOpened, qrtDone])

  const secondaryClass =
    'font-manrope text-xs font-bold text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="flex flex-col items-center">
      <ResultCard ref={cardRef} result={result} />

      <div className="mt-8 h-px w-full max-w-lg bg-white/10" />

      <p className="font-mono mt-6 text-[10px] font-bold uppercase tracking-widest text-main-yellow">Next step</p>
      <h3 className="font-manrope mt-2 max-w-lg text-center text-xl font-black uppercase leading-tight text-white md:text-2xl">
        Share your diagnosis on X to continue
      </h3>

      <button
        type="button"
        onClick={handleQuoteRetweet}
        disabled={qrtDone}
        className="font-manrope mt-5 w-full max-w-lg rounded-xl bg-ticket-red px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
      >
        𝕏 Share on X
      </button>

      <button
        type="button"
        onClick={onContinue}
        disabled={!qrtDone}
        className={cn(
          'font-manrope mt-3 w-full max-w-lg rounded-xl border px-6 py-4 text-sm font-black uppercase tracking-wide transition-colors',
          qrtDone
            ? 'border-main-yellow bg-main-yellow text-black hover:opacity-90'
            : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30',
        )}
      >
        {qrtDone ? 'Continue →' : '🔒 Continue'}
      </button>
      <p
        className={cn(
          'font-mono mt-2 text-[10px] uppercase tracking-widest',
          qrtDone ? 'text-main-yellow' : 'text-white/40',
        )}
      >
        {qrtDone ? '✓ Signal received' : 'Share to unlock'}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <DownloadButton
          targetRef={cardRef}
          filename={`ptsd-${result.handle}.png`}
          className={`${secondaryClass} !w-auto !border-0 !bg-transparent !px-0 !py-0 !font-bold !text-xs`}
        />
        <span className="text-white/20">·</span>
        <button type="button" onClick={handleCopyImage} disabled={copyState === 'busy'} className={secondaryClass}>
          {copyState === 'busy' && 'Copying…'}
          {copyState === 'copied' && 'Copied!'}
          {copyState === 'failed' && "Couldn't copy"}
          {copyState === 'idle' && 'Copy Image'}
        </button>
      </div>

      <OffRampNotice />
    </div>
  )
}

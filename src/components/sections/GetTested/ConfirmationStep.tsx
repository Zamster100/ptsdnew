'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { DiagnosisResult } from '@/lib/getTested/types'
import { CornerStamp } from './CornerStamp'
import { DownloadButton } from './DownloadButton'
import { ResultCard } from './ResultCard'

interface ConfirmationStepProps {
  result: DiagnosisResult
}

export const ConfirmationStep = ({ result }: ConfirmationStepProps) => {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center md:p-10">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ticket-red via-main-yellow to-ticket-red" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ticket-red/20 blur-3xl" />

        <CornerStamp label="Confirmed" />

        <h2 className="font-manrope mb-3 text-2xl font-black uppercase leading-tight text-white md:text-3xl">
          You&apos;re in the Queue
        </h2>
        <p className="font-manrope mx-auto mb-6 max-w-md text-sm leading-[1.7] text-light-text">
          Winners announced in 72 hours.
        </p>

        <p className="font-mono mb-8 text-[10px] uppercase tracking-[0.2em] text-white/40">
          Patient No. {result.patientNo}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-block">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center">
        <ResultCard ref={cardRef} result={result} />
        <DownloadButton
          targetRef={cardRef}
          filename={`ptsd-${result.handle}.png`}
          className="font-manrope mt-6 text-xs font-bold text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline !w-auto !border-0 !bg-transparent !px-0 !py-0"
        />
      </div>
    </div>
  )
}

import { ResultCard } from '@/components/sections/GetTested/ResultCard'
import { DiagnosisResult } from '@/lib/getTested/types'
import { BandId } from '@/lib/getTested/scoring'
import { getRandomPatientPhoto } from '@/lib/getTested/photos'
import { getBaseNote } from '@/lib/getTested/data'

/**
 * TEMPORARY dev-only preview — not linked from anywhere in the site nav.
 * Renders the real ResultCard component (not a recreated mockup) against
 * one fabricated result per band, so band-tier/color changes can be
 * eyeballed without running the full Grok flow 6 times. Safe to delete
 * once the design is confirmed.
 */

const SAMPLES: { band: BandId; result: DiagnosisResult }[] = [
  {
    band: 'untouched',
    result: {
      id: 1, patientNo: '000101', handle: 'normiewallet',
      type: 'THE PERMA BEAR', note: `${getBaseNote('THE PERMA BEAR')} Case otherwise unremarkable.`,
      worst: 'Undisclosed. Patient declined to elaborate.',
      scores: { A: 2, B: 1, C: 3, D: 2, E: 1 }, traumaIndex: 810, band: 'untouched', memberSince: 2024,
      photoUrl: getRandomPatientPhoto('THE PERMA BEAR'),
    },
  },
  {
    band: 'exposed',
    result: {
      id: 2, patientNo: '004417', handle: 'bigdick1010',
      type: 'THE HAUNTED', note: `${getBaseNote('THE HAUNTED')} Recently posted about a $PEPE liquidation.`,
      worst: 'Not selling.',
      scores: { A: 12, B: 7, C: 3, D: 9, E: 4 }, traumaIndex: 3150, band: 'exposed', memberSince: null,
      photoUrl: getRandomPatientPhoto('THE HAUNTED'),
    },
  },
  {
    band: 'symptomatic',
    result: {
      id: 3, patientNo: '000015', handle: 'kinggszn',
      type: 'THE PARANOID DEGEN', note: `${getBaseNote('THE PARANOID DEGEN')} Posts are timestamped 3am nightly.`,
      worst: 'Took a 10x after one hour then missed the extra 100x that followed.',
      scores: { A: 10, B: 6, C: 8, D: 17, E: 9 }, traumaIndex: 4501, band: 'symptomatic', memberSince: 2021,
      photoUrl: getRandomPatientPhoto('THE PARANOID DEGEN'),
    },
  },
  {
    band: 'chronic',
    result: {
      id: 4, patientNo: '007731', handle: 'coldwallet',
      type: 'THE NUMB', note: `${getBaseNote('THE NUMB')} Portfolio reads -$40k unrealized.`,
      worst: 'Undisclosed. Patient declined to elaborate.',
      scores: { A: 8, B: 14, C: 10, D: 9, E: 20 }, traumaIndex: 5491, band: 'chronic', memberSince: null,
      photoUrl: getRandomPatientPhoto('THE NUMB'),
    },
  },
  {
    band: 'terminal',
    result: {
      id: 5, patientNo: '000092', handle: 'speedberg',
      type: 'THE HAUNTED', note: `${getBaseNote('THE HAUNTED')} Screenshots the same chart nightly.`,
      worst: 'A friend introduced him to the token that ended it all.',
      scores: { A: 19, B: 18, C: 15, D: 16, E: 17 }, traumaIndex: 7652, band: 'terminal', memberSince: 2013,
      photoUrl: getRandomPatientPhoto('THE HAUNTED'),
    },
  },
  {
    band: 'over9000',
    result: {
      id: 6, patientNo: '009001', handle: 'lastbagholder',
      type: 'THE NUMB', note: `${getBaseNote('THE NUMB')} Describes six figures as "just numbers."`,
      worst: 'Everything. In order.',
      scores: { A: 20, B: 19, C: 20, D: 19, E: 20 }, traumaIndex: 8821, band: 'over9000', memberSince: null,
      photoUrl: getRandomPatientPhoto('THE NUMB'),
    },
  },
]

export default function ResultCardPreviewPage() {
  return (
    <div className="min-h-screen bg-black px-6 py-16">
      <p className="font-mono mb-10 text-center text-xs uppercase tracking-widest text-white/40">
        Result card preview — all 6 bands (temporary, dev-only)
      </p>
      <div className="mx-auto flex max-w-[1600px] flex-wrap justify-center gap-10">
        {SAMPLES.map(({ band, result }) => (
          <div key={band} className="flex flex-col items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">
              Band: {band}
            </p>
            <ResultCard result={result} />
          </div>
        ))}
      </div>
    </div>
  )
}

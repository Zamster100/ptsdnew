import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'
import { computeScore } from '@/lib/getTested/scoring'
import { INTAKE_QUESTIONS } from '@/lib/getTested/data'

const CYCLE_OPTIONS = INTAKE_QUESTIONS.find(q => q.key === 'cycle')!.options
const WORST_OPTIONS = INTAKE_QUESTIONS.find(q => q.key === 'worst')!.options

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 submissions per IP per hour
  const ip = getIp(req)
  if (!rateLimit(`get-tested-submit:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { handle, cycle, worst, answers } = body as {
    handle: unknown
    cycle: unknown
    worst: unknown
    answers: unknown
  }

  const trimmedHandle = typeof handle === 'string' ? handle.trim() : ''
  if (!trimmedHandle || trimmedHandle.length > 32) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 })
  }

  if (typeof cycle !== 'string' || !CYCLE_OPTIONS.includes(cycle)) {
    return NextResponse.json({ error: 'Invalid cycle answer' }, { status: 400 })
  }
  if (typeof worst !== 'string' || !WORST_OPTIONS.includes(worst)) {
    return NextResponse.json({ error: 'Invalid worst answer' }, { status: 400 })
  }

  if (
    !Array.isArray(answers) ||
    answers.length !== 10 ||
    !answers.every(a => Number.isInteger(a) && a >= 0 && a <= 4)
  ) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  }

  const result = computeScore(answers as number[])

  const { data, error } = await supabase
    .from('patients')
    .insert({
      handle: trimmedHandle,
      cycle,
      worst,
      answers,
      cluster_scores: result.clusterScores,
      raw_score: result.rawScore,
      trauma_index: result.traumaIndex,
      band: result.band,
      result_type: result.resultType,
      malingering: result.malingering,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[get-tested/submit] insert error:', error)

    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    clusterScores: result.clusterScores,
    rawScore: result.rawScore,
    traumaIndex: result.traumaIndex,
    band: result.band,
    bandLabel: result.bandLabel,
    bandCopy: result.bandCopy,
    resultType: result.resultType,
    typeLine: result.typeLine,
    malingering: result.malingering,
  })
}

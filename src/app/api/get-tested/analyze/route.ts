import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { analyzeHandle } from '@/lib/grok'
import { getMemberSinceYear } from '@/lib/xApi'
import { computeFromScores } from '@/lib/getTested/scoring'
import { getBaseNote } from '@/lib/getTested/data'
import { supabase } from '@/lib/supabase'

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/

// Each analysis costs a real Grok API call — cap retests per handle regardless of IP.
const RETEST_COOLDOWN_MS = 24 * 60 * 60 * 1000

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 analyses per IP per hour (x_search calls are slow and costly)
  const ip = getIp(req)
  if (!rateLimit(`get-tested-analyze:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawHandle = typeof body.handle === 'string' ? body.handle.trim().replace(/^@/, '') : ''
  if (!HANDLE_RE.test(rawHandle)) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 })
  }

  const { data: lastDiagnosis, error: cooldownLookupError } = await supabase
    .from('diagnoses')
    .select('created_at')
    .ilike('handle', rawHandle)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cooldownLookupError) {
    // Don't let a transient DB hiccup permanently block a legitimate retest — log and proceed.
    console.error('[get-tested/analyze] cooldown lookup error:', cooldownLookupError)
  } else if (lastDiagnosis) {
    const retryAt = new Date(lastDiagnosis.created_at).getTime() + RETEST_COOLDOWN_MS
    if (Date.now() < retryAt) {
      return NextResponse.json({ error: 'Retest cooldown active', retryAt }, { status: 429 })
    }
  }

  const analysis = await analyzeHandle(rawHandle)
  const computed = computeFromScores(analysis.scores)
  const note = `${getBaseNote(computed.type)} ${analysis.detail}`.trim()
  const memberSince = await getMemberSinceYear(rawHandle)

  const { data, error } = await supabase
    .from('diagnoses')
    .insert({
      handle: rawHandle,
      type: computed.type,
      note,
      worst: analysis.worst,
      cluster_scores: analysis.scores,
      trauma_index: computed.index,
      member_since: memberSince,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[get-tested/analyze] insert error:', error)

    return NextResponse.json({ error: 'Failed to save diagnosis' }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    patientNo: String(data.id).padStart(6, '0'),
    handle: rawHandle,
    type: computed.type,
    note,
    worst: analysis.worst,
    scores: analysis.scores,
    traumaIndex: computed.index,
    band: computed.band,
    memberSince,
  })
}

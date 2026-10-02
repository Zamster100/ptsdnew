import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { analyzeHandle } from '@/lib/grok'
import { getMemberSinceYear } from '@/lib/xApi'
import { computeFromScores } from '@/lib/getTested/scoring'
import { CONTEST_CLOSED, getBaseNote } from '@/lib/getTested/data'
import { supabase } from '@/lib/supabase'

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  if (CONTEST_CLOSED) {
    return NextResponse.json({ error: 'Testing is closed' }, { status: 410 })
  }

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

  // Returning handle: serve the stored diagnosis instead of paying for another Grok run.
  // `_` is a single-char wildcard in ilike, and handles can contain it — escape so it only matches itself.
  const { data: existing, error: lookupError } = await supabase
    .from('diagnoses')
    .select('id, handle, type, note, worst, cluster_scores, trauma_index, member_since, claimed_at')
    .ilike('handle', rawHandle.replace(/_/g, '\\_'))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    // Don't let a transient DB hiccup block a legitimate first-time diagnosis — log and proceed.
    console.error('[get-tested/analyze] existing-diagnosis lookup error:', lookupError)
  } else if (existing) {
    return NextResponse.json({
      id: existing.id,
      patientNo: String(existing.id).padStart(6, '0'),
      handle: existing.handle,
      type: existing.type,
      note: existing.note,
      worst: existing.worst,
      scores: existing.cluster_scores,
      traumaIndex: existing.trauma_index,
      band: computeFromScores(existing.cluster_scores).band,
      memberSince: existing.member_since,
      claimed: Boolean(existing.claimed_at),
    })
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

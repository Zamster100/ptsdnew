import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'

const ETH_RE = /^0x[a-fA-F0-9]{40}$/

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  if (!rateLimit(`get-tested-claim:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const diagnosisId = typeof body.diagnosisId === 'number' ? body.diagnosisId : Number(body.diagnosisId)
  const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''

  if (!Number.isInteger(diagnosisId) || diagnosisId <= 0) {
    return NextResponse.json({ error: 'Invalid diagnosis reference' }, { status: 400 })
  }
  if (!ETH_RE.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  // A wallet can only be attached to a diagnosis that actually exists —
  // reject here, not just hide the screen client-side.
  const { data: diagnosis, error: lookupError } = await supabase
    .from('diagnoses')
    .select('id')
    .eq('id', diagnosisId)
    .single()

  if (lookupError || !diagnosis) {
    return NextResponse.json({ error: 'No diagnosis on record for this session' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('diagnoses')
    .update({ wallet, claimed_at: new Date().toISOString() })
    .eq('id', diagnosisId)

  if (updateError) {
    console.error('[get-tested/claim] update error:', updateError)

    return NextResponse.json({ error: 'Failed to record claim' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

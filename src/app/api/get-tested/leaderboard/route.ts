import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function GET(req: NextRequest) {
  // Rate limit: 30 lookups per IP per minute
  const ip = getIp(req)
  if (!rateLimit(`get-tested-leaderboard:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? '50')
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50))

  const { data, error } = await supabase
    .from('patients')
    .select('id, handle, trauma_index, band, result_type, created_at')
    .order('trauma_index', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[get-tested/leaderboard] query error:', error)

    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }

  return NextResponse.json({
    patients: data.map(row => ({
      id: row.id,
      handle: row.handle,
      traumaIndex: row.trauma_index,
      band: row.band,
      resultType: row.result_type,
      createdAt: row.created_at,
    })),
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { checkWhitelist } from '@/lib/googleSheets'

const ETH_RE = /^0x[a-fA-F0-9]{40}$/
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

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
  if (!rateLimit(`whitelist:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const wallet = req.nextUrl.searchParams.get('wallet')?.trim() ?? ''

  if (!ETH_RE.test(wallet) && !SOL_RE.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  try {
    const result = await checkWhitelist(wallet)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Whitelist lookup error:', err)

    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}

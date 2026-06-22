import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'

const ETH_RE = /^0x[a-fA-F0-9]{40}$/

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
  if (!rateLimit(`lookup:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const wallet = req.nextUrl.searchParams.get('wallet')?.trim() ?? ''

  if (!ETH_RE.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('minters')
    .select('id, eth_wallet, sol_transaction, quantity, created_at')
    .eq('eth_wallet', wallet.toLowerCase())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase lookup error:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  return NextResponse.json({ mints: data })
}

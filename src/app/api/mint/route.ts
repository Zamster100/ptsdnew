import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'

const ETH_RE = /^0x[a-fA-F0-9]{40}$/
// Solana tx signatures are base58 — accept 30-100 chars to allow for Helio's format
const SOL_TX_RE = /^[1-9A-HJ-NP-Za-km-z]{30,100}$/

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 mints per IP per hour
  const ip = getIp(req)
  if (!rateLimit(`mint:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Origin check — only enforce if NEXT_PUBLIC_SITE_URL is configured
  if (process.env.NODE_ENV === 'production') {
    const origin = req.headers.get('origin') ?? ''
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
    if (siteUrl && !origin.startsWith(siteUrl)) {
      console.error('[mint] origin blocked:', { origin, siteUrl })

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { ethWallet, solTransaction, quantity } = body as {
    ethWallet: unknown
    solTransaction: unknown
    quantity: unknown
  }

  if (typeof ethWallet !== 'string' || !ETH_RE.test(ethWallet)) {
    console.error('[mint] invalid eth wallet:', ethWallet)

    return NextResponse.json({ error: 'Invalid ETH wallet' }, { status: 400 })
  }
  if (typeof solTransaction !== 'string' || !SOL_TX_RE.test(solTransaction.trim())) {
    console.error('[mint] invalid tx signature:', solTransaction)

    return NextResponse.json({ error: 'Invalid transaction signature' }, { status: 400 })
  }

  const qty = Math.max(1, Math.min(100, Number(quantity) || 1))

  const { error } = await supabase.from('minters').insert({
    eth_wallet: ethWallet.toLowerCase(),
    sol_transaction: solTransaction.trim(),
    quantity: qty,
  })

  // 23505 = unique_violation — tx already recorded, treat as success
  if (error && error.code !== '23505') {
    console.error('Supabase insert error:', error)

    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

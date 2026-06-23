import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {

    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 })
  }

  // Log immediately — before any parsing — so we always see something if the webhook fires
  console.log('[helio-webhook] received — body length:', rawBody.length)
  console.log('[helio-webhook] raw body:', rawBody.slice(0, 2000))

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    console.error('[helio-webhook] invalid JSON')

    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[helio-webhook] top-level keys:', Object.keys(event))
  console.log('[helio-webhook] full event:', JSON.stringify(event).slice(0, 3000))

  const tx = event.transactionObject as Record<string, unknown> | undefined
  if (!tx) {
    console.warn('[helio-webhook] no transactionObject — keys were:', Object.keys(event))

    return NextResponse.json({ ok: true })
  }

  const meta = tx.meta as Record<string, unknown> | undefined

  console.log('[helio-webhook] transactionObject keys:', Object.keys(tx))
  console.log('[helio-webhook] meta:', JSON.stringify(meta))

  const solTx = String(meta?.transactionSignature ?? '')
  const txStatus = String(meta?.transactionStatus ?? '')

  // quantity may be in meta or at transactionObject root — check both
  const rawQty = meta?.quantity ?? tx.quantity ?? tx.itemQuantity ?? tx.paylinkQuantity ?? 1
  const quantity = Math.max(1, Number(rawQty))

  console.log('[helio-webhook] quantity sources — meta.quantity:', meta?.quantity, '| tx.quantity:', tx.quantity, '| resolved:', quantity)

  if (txStatus !== 'SUCCESS') {
    console.log('[helio-webhook] skipping — txStatus:', txStatus)

    return NextResponse.json({ ok: true })
  }

  if (!solTx) {
    console.error('[helio-webhook] missing transactionSignature in meta')

    return NextResponse.json({ error: 'Missing transaction' }, { status: 400 })
  }

  // Retry loop: if the webhook beats /api/mint to the DB, wait and retry until the row exists.
  // Max 5 attempts × 600 ms = ~3 s — well within Vercel's function timeout.
  let attempts = 0
  let data = null
  let error = null

  while (attempts < 5) {
    const result = await supabase
      .from('minters')
      .update({ quantity })
      .eq('sol_transaction', solTx)
      .select('id, quantity')

    error = result.error
    data = result.data

    if (error) break
    if (data && data.length > 0) break

    attempts++
    console.log(`[helio-webhook] no row yet, retrying (${attempts}/5)…`)
    await new Promise(r => setTimeout(r, 600))
  }

  if (error) {
    console.error('[helio-webhook] supabase error:', error)

    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  console.log('[helio-webhook] rows updated:', data?.length ?? 0, 'after', attempts, 'retries', data)

  return NextResponse.json({ ok: true })
}

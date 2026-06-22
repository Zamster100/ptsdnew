import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.text()
  console.log('[helio-webhook] received:', body)

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only process successful payments
  const eventType = event.transactionObject
    ? 'PAYLINK_PAYMENT_SUCCESS'
    : String(event.event ?? '')

  if (eventType !== 'PAYLINK_PAYMENT_SUCCESS' && !event.transactionObject) {
    return NextResponse.json({ ok: true })
  }

  // Helio webhook payload shape (log above will confirm exact fields)
  const tx = (event.transactionObject ?? event.transaction ?? event) as Record<string, unknown>
  const meta = tx.meta as Record<string, unknown> | undefined
  const additionalJSON = meta?.additionalJSON as Record<string, unknown> | undefined

  const solTx = String(tx.transactionSignature ?? tx.signature ?? '')
  const ethWallet = String(
    additionalJSON?.additionalProductValue ?? tx.additionalProductValue ?? '',
  )
  const quantity = Number(tx.quantity ?? tx.amount ?? meta?.quantity ?? 1)

  if (!solTx) {
    console.error('[helio-webhook] missing transactionSignature in payload')

    return NextResponse.json({ error: 'Missing transaction' }, { status: 400 })
  }

  // Upsert: insert if new, update quantity if record already exists from client-side save
  const { error } = await supabase.from('minters').upsert(
    {
      eth_wallet: ethWallet.toLowerCase() || 'unknown',
      sol_transaction: solTx,
      quantity,
    },
    { onConflict: 'sol_transaction' },
  )

  if (error) {
    console.error('[helio-webhook] supabase error:', error)

    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

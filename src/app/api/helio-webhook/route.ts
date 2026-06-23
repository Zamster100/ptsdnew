import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  let event: Record<string, unknown>
  try {
    event = JSON.parse(await req.text())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tx = event.transactionObject as Record<string, unknown> | undefined
  if (!tx) {
    return NextResponse.json({ ok: true })
  }

  const meta = tx.meta as Record<string, unknown> | undefined

  // Log full payload so we can verify Helio's field structure
  console.log('[helio-webhook] raw event keys:', Object.keys(event))
  console.log('[helio-webhook] transactionObject keys:', Object.keys(tx))
  console.log('[helio-webhook] meta:', JSON.stringify(meta))

  // transactionSignature lives inside transactionObject.meta
  const solTx = String(meta?.transactionSignature ?? '')
  const txStatus = String(meta?.transactionStatus ?? '')

  // quantity may be in meta or at transactionObject root — check both
  const rawQty = meta?.quantity ?? tx.quantity ?? tx.itemQuantity ?? tx.paylinkQuantity ?? 1
  const quantity = Math.max(1, Number(rawQty))

  console.log('[helio-webhook] quantity sources — meta.quantity:', meta?.quantity, '| tx.quantity:', tx.quantity, '| resolved:', quantity)

  if (txStatus !== 'SUCCESS') {
    return NextResponse.json({ ok: true })
  }

  if (!solTx) {
    console.error('[helio-webhook] missing transactionSignature in meta')

    return NextResponse.json({ error: 'Missing transaction' }, { status: 400 })
  }

  console.log('[helio-webhook] updating quantity:', { solTx, quantity })

  // Update quantity on the record the client-side save already inserted.
  // ETH wallet is not in the webhook payload — we preserve it by doing UPDATE not upsert.
  const { data, error } = await supabase
    .from('minters')
    .update({ quantity })
    .eq('sol_transaction', solTx)
    .select('id, quantity')

  if (error) {
    console.error('[helio-webhook] supabase error:', error)

    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  console.log('[helio-webhook] rows updated:', data?.length ?? 0, data)

  return NextResponse.json({ ok: true })
}

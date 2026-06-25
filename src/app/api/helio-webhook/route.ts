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

  // For ETH payments, senderPK is the ETH wallet address — capture it directly from the
  // webhook so the row is fully populated without needing the client onSuccess callback.
  const ETH_WALLET_RE = /^0x[a-fA-F0-9]{40}$/
  const senderPK = String(meta?.senderPK ?? '')
  const ethWalletFromWebhook = ETH_WALLET_RE.test(senderPK) ? senderPK.toLowerCase() : null

  console.log('[helio-webhook] senderPK:', senderPK, '| ethWalletFromWebhook:', ethWalletFromWebhook)

  const upsertData: Record<string, unknown> = { sol_transaction: solTx, quantity }
  if (ethWalletFromWebhook) {
    upsertData.eth_wallet = ethWalletFromWebhook
  }

  // Upsert: creates the row if the client callback never fired (ETH/Rabby wallet payments),
  // or updates quantity (and eth_wallet if available) on the existing row.
  const { data, error } = await supabase
    .from('minters')
    .upsert(upsertData, { onConflict: 'sol_transaction' })
    .select('id, quantity')

  if (error) {
    console.error('[helio-webhook] supabase error:', error)

    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  console.log('[helio-webhook] upserted:', data)

  return NextResponse.json({ ok: true })
}

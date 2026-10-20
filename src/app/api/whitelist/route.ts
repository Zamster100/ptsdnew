import { NextResponse } from 'next/server'

// Whitelist checker retired — the finalized list now lives on OpenSea.
export async function GET() {
  return NextResponse.json(
    { error: 'The whitelist has been finalized and moved to OpenSea.' },
    { status: 410 },
  )
}

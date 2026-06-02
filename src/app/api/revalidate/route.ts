import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    // Verify Contentful webhook secret header if configured
    const webhookSecret = process.env.CONTENTFUL_WEBHOOK_SECRET
    const secretHeader = request.headers.get('x-contentful-webhook-secret')

    if (webhookSecret && secretHeader) {
      if (secretHeader !== webhookSecret) {
        console.error('Invalid webhook secret')

        return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
      }
    } else if (webhookSecret && !secretHeader) {
      // If secret is configured but header is missing, reject the request
      console.error('Missing webhook secret header')

      return NextResponse.json(
        { error: 'Missing secret header' },
        { status: 401 },
      )
    }

    revalidatePath('/')

    return NextResponse.json({
      revalidated: true,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

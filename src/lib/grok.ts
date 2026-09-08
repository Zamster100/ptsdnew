import { GrokProfile } from './getTested/types'

const XAI_API_URL = 'https://api.x.ai/v1/responses'
const MODEL = 'grok-4.6'

const SYSTEM_PROMPT = `You are writing a single clinical-style chart note for a satirical crypto
psychiatric screening tool called PTSD-25. You will be given access to a
user's X posts via search. Base your read ONLY on what you actually find in
their posts — do not invent details.

Classify the account into exactly ONE of these five types, choosing whichever
fits best:

- THE HAUNTED (intrusive recall of past trades/prices)
- THE BAG HOLDER (avoidance, holding losers, denial)
- THE PERMA BEAR (cynicism, calling everything a rug)
- THE PARANOID DEGEN (hypervigilance, late-night checking, anxious posting)
- THE DISCONNECTED (numbness, dissociation, detached tone about big swings)

Then write ONE short clinical-note-style observation (1-2 sentences, third
person, dry, deadpan, like a psychiatrist's chart note) that references
something SPECIFIC and real you found in their posts. Do not use generic
filler — the specificity is the whole joke.

Return ONLY valid JSON in this exact shape, nothing else:
{"type": "THE ___", "note": "..."}`

const FALLBACK_PROFILE: GrokProfile = {
  type: 'THE DISCONNECTED',
  note: "Insufficient data to complete evaluation. Patient's posting history could not be interpreted.",
}

interface ResponsesApiOutputContent {
  type: string
  text?: string
}

interface ResponsesApiOutputItem {
  type: string
  content?: ResponsesApiOutputContent[]
}

interface ResponsesApiBody {
  output_text?: string
  output?: ResponsesApiOutputItem[]
}

function extractOutputText(data: ResponsesApiBody): string {
  if (typeof data.output_text === 'string') return data.output_text

  for (const item of data.output ?? []) {
    if (item.type !== 'message') continue
    const textPart = item.content?.find(c => c.type === 'output_text' && typeof c.text === 'string')
    if (textPart?.text) return textPart.text
  }

  return ''
}

/**
 * Grok is told to return only JSON but sometimes wraps it in prose anyway —
 * slice out the outermost {...} span before parsing rather than trusting
 * the whole response body to be clean JSON.
 */
function parseProfile(raw: string): GrokProfile {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in Grok response')
  }

  const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).type !== 'string' ||
    typeof (parsed as Record<string, unknown>).note !== 'string'
  ) {
    throw new Error('Malformed profile JSON from Grok')
  }

  const { type, note } = parsed as { type: string; note: string }

  return { type, note }
}

export async function analyzeHandle(handle: string): Promise<GrokProfile> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    console.error('[grok] XAI_API_KEY is not set')

    return FALLBACK_PROFILE
  }

  try {
    const res = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze @${handle}'s recent posts and return the JSON result.` },
        ],
        tools: [{ type: 'x_search', allowed_x_handles: [handle] }],
      }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      console.error('[grok] API error:', res.status, await res.text())

      return FALLBACK_PROFILE
    }

    const data = (await res.json()) as ResponsesApiBody

    return parseProfile(extractOutputText(data))
  } catch (err) {
    console.error('[grok] analyze failed:', err)

    return FALLBACK_PROFILE
  }
}

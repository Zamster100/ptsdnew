import type { GrokAnalysis } from './getTested/types'

const XAI_API_URL = 'https://api.x.ai/v1/responses'
const MODEL = 'grok-4.6'

const SYSTEM_PROMPT = `You are writing a single clinical-style chart note for a satirical crypto
psychiatric screening tool called PTSD. You will be given access to a
user's X posts via search. Base your read ONLY on what you actually find in
their posts — do not invent details.

Based on the user's actual X posts, score them 0-20 on each of these five
clusters, using your judgment of how strongly their posts reflect each
pattern:

A - Intrusion: unprompted recall of past trades/prices, thinking about old
    positions unprompted.
B - Avoidance: avoiding checking portfolio, avoiding certain topics/tickers,
    going quiet on losses.
C - Cognition: cynicism, calling things rugs, distrust, self-blame framing.
D - Hypervigilance: late-night posting/checking, anxious tone, obsessive
    monitoring language.
E - Dissociation: numbness, detachment, treating losses/gains as unreal or
    "just numbers."

A score of 0 means no evidence of this pattern in their posts. A score of 20
means overwhelming, repeated evidence. Most people should NOT max every
category — differentiate based on what you actually find.

Each of the five diagnosis types already has a FIXED base clinical note —
shown below for voice reference only. Do NOT write this note yourself, do
not repeat it, and do not paraphrase it — it gets added automatically after
your response:

- THE HAUNTED: "Patient still sees the exact candle that liquidated him
  whenever he closes his eyes. Sleep has been delisted."
- THE BAG HOLDER: "Patient is down 94% but insists he hasn't lost because
  he hasn't sold. Mathematics has left the session."
- THE PERMA BEAR: "Patient has predicted 37 of the last four crashes.
  Refuses treatment while the market remains above zero."
- THE PARANOID DEGEN: "Patient checks the chart at 3:17 a.m. to “manage
  risk.” Total position size: $42."
- THE NUMB: "Patient watched the portfolio hit zero, whispered “fair,”
  and opened another trade."

Your only job for the "detail" field is to write a SHORT ADDENDUM — just a
few words, one short clause, no more than about 10 words, in the exact same
dry deadpan clinical voice — adding ONE specific, real detail you actually
found in their posts for whichever cluster scored highest (a ticker, a
dollar amount, an event, a timeframe — anything concrete). This gets
appended directly after the fixed note above, so it must NOT restate or
rephrase the fixed note, and must read as a natural continuation of it. If
you can't find anything specific and real, write "Case otherwise
unremarkable." instead of inventing something.

Finally, find ONE specific bad call, loss, or regret visible in their
post history and paraphrase it in a single line for the "worst" field.
PARAPHRASE ONLY — never quote their post text directly/verbatim. If you
can't find a clear specific example, write "Undisclosed. Patient declined
to elaborate." instead of guessing.

Return ONLY valid JSON in this exact shape, nothing else:
{
  "scores": { "A": 0-20, "B": 0-20, "C": 0-20, "D": 0-20, "E": 0-20 },
  "detail": "...",
  "worst": "..."
}`

/**
 * Used whenever the Grok call fails outright (timeout, API error, malformed
 * response) — scores are seeded so Hypervigilance (D) wins, landing on
 * THE PARANOID DEGEN, so a failure never renders as a blank/all-zero card.
 */
const FALLBACK_ANALYSIS: GrokAnalysis = {
  scores: { A: 4, B: 4, C: 4, D: 13, E: 4 },
  detail: "Insufficient data to complete evaluation. Patient's posting history could not be interpreted.",
  worst: 'Undisclosed. Patient declined to elaborate.',
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

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) throw new Error('Non-numeric cluster score in Grok response')

  return Math.max(0, Math.min(20, Math.round(n)))
}

/**
 * Grok is told to return only JSON but sometimes wraps it in prose anyway —
 * slice out the outermost {...} span before parsing rather than trusting
 * the whole response body to be clean JSON.
 */
function parseAnalysis(raw: string): GrokAnalysis {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in Grok response')
  }

  const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Malformed analysis JSON from Grok')
  }

  const obj = parsed as Record<string, unknown>
  const scoresObj = obj.scores

  if (typeof scoresObj !== 'object' || scoresObj === null) {
    throw new Error('Malformed scores object from Grok')
  }
  if (typeof obj.detail !== 'string' || typeof obj.worst !== 'string') {
    throw new Error('Malformed analysis JSON from Grok')
  }

  const s = scoresObj as Record<string, unknown>

  return {
    scores: {
      A: clampScore(s.A),
      B: clampScore(s.B),
      C: clampScore(s.C),
      D: clampScore(s.D),
      E: clampScore(s.E),
    },
    detail: obj.detail,
    worst: obj.worst,
  }
}

export async function analyzeHandle(handle: string): Promise<GrokAnalysis> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    console.error('[grok] XAI_API_KEY is not set')

    return FALLBACK_ANALYSIS
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

      return FALLBACK_ANALYSIS
    }

    const data = (await res.json()) as ResponsesApiBody

    return parseAnalysis(extractOutputText(data))
  } catch (err) {
    console.error('[grok] analyze failed:', err)

    return FALLBACK_ANALYSIS
  }
}

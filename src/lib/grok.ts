import type { ClusterScores, GrokAnalysis } from './getTested/types'

const XAI_API_URL = 'https://api.x.ai/v1/responses'
// grok-4.3 supports x_search and is priced well below the 4.5/4.6/4.7 line
// (confirmed against the live API) — token cost is a minor slice of the
// per-diagnosis bill next to X Search's per-post/per-profile fetch pricing,
// but it's a free savings on top of the fetch-side constraints below.
const MODEL = 'grok-4.3'

// X Search bills $5/1k posts fetched and $10/1k profiles fetched, and fetches
// are NOT deduplicated across search calls within a single request — an
// unconstrained agent that re-searches or follows threads pays for the same
// post multiple times. Cap it hard: one search, no threads, no profile
// lookups, a bounded recent post count.
const MAX_POSTS = 15
const SEARCH_WINDOW_DAYS = 90

const SYSTEM_PROMPT = `You are writing a single clinical-style chart note for a satirical crypto
psychiatric screening tool called PTSD. You will be given access to a
user's X posts via search. Base your read ONLY on what you actually find in
their posts — do not invent details.

COST CONSTRAINT — follow exactly: call the X search tool AT MOST ONCE for
this analysis. Do not fetch threads, parent posts, quoted posts, or replies,
and do not perform any user/profile lookups. Base your entire analysis on at
most the ${MAX_POSTS} most recent original posts from the account.

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

const CLUSTER_IDS: (keyof ClusterScores)[] = ['A', 'B', 'C', 'D', 'E']

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Used whenever the Grok call fails outright (timeout, API error, hard
 * budget cutoff, bot-traffic spike, malformed response) so a failure never
 * renders as a blank/all-zero card. The winning cluster is randomized per
 * call — a fixed default would mean every diagnosis during an outage or a
 * bot pile-on comes back as the exact same type, which is both a giveaway
 * and a bad look if people compare results. The 11-18 vs 1-9 score gap
 * guarantees the chosen cluster wins outright, no tie-break involved.
 */
function fallbackAnalysis(): GrokAnalysis {
  const winner = CLUSTER_IDS[randInt(0, CLUSTER_IDS.length - 1)]
  const scores = {} as ClusterScores
  for (const id of CLUSTER_IDS) {
    scores[id] = id === winner ? randInt(11, 18) : randInt(1, 9)
  }

  return {
    scores,
    detail: "Insufficient data to complete evaluation. Patient's posting history could not be interpreted.",
    worst: 'Undisclosed. Patient declined to elaborate.',
  }
}

interface ResponsesApiOutputContent {
  type: string
  text?: string
}

interface ResponsesApiOutputItem {
  type: string
  content?: ResponsesApiOutputContent[]
}

interface ResponsesApiUsage {
  cost_in_usd_ticks?: number
  server_side_tool_usage_details?: {
    x_search_calls?: number
    x_posts_fetched?: number
    x_users_fetched?: number
  }
}

interface ResponsesApiBody {
  output_text?: string
  output?: ResponsesApiOutputItem[]
  usage?: ResponsesApiUsage
}

function logUsage(handle: string, usage?: ResponsesApiUsage) {
  if (!usage) return
  const t = usage.server_side_tool_usage_details
  // cost_in_usd_ticks isn't documented; empirically it's ~1e-10 USD per tick
  // (verified against known token/fetch pricing) — treat as an estimate.
  const costUsd = typeof usage.cost_in_usd_ticks === 'number' ? usage.cost_in_usd_ticks / 1e10 : null

  console.log(
    `[grok] usage handle=${handle} searches=${t?.x_search_calls ?? '?'} ` +
      `postsFetched=${t?.x_posts_fetched ?? '?'} usersFetched=${t?.x_users_fetched ?? '?'} ` +
      `costUsd=${costUsd !== null ? costUsd.toFixed(4) : '?'}`
  )
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

    return fallbackAnalysis()
  }

  try {
    const fromDate = new Date(Date.now() - SEARCH_WINDOW_DAYS * 86400_000).toISOString().slice(0, 10)

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
        tools: [{ type: 'x_search', allowed_x_handles: [handle], from_date: fromDate }],
      }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      console.error('[grok] API error:', res.status, await res.text())

      return fallbackAnalysis()
    }

    const data = (await res.json()) as ResponsesApiBody
    logUsage(handle, data.usage)

    return parseAnalysis(extractOutputText(data))
  } catch (err) {
    console.error('[grok] analyze failed:', err)

    return fallbackAnalysis()
  }
}

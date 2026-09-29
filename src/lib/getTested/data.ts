import { CLUSTERS } from './scoring'

/**
 * Accent colors keyed by the exact type strings Grok is instructed to
 * return (see the SYSTEM_PROMPT in src/lib/grok.ts) — derived from
 * `CLUSTERS` (scoring.ts) so the type-name/strip/glow/EKG color always
 * matches that same cluster's bar color on the result card.
 */
export const TYPE_ACCENTS: Record<string, string> = Object.fromEntries(
  CLUSTERS.map(c => [c.typeName, c.color]),
)

// An unrecognized/missing type should never render blank — fall back to THE PARANOID DEGEN
// everywhere, matching the same fallback computeFromScores uses (scoring.ts).
const DEFAULT_CLUSTER = CLUSTERS.find(c => c.id === 'D')!
const DEFAULT_ACCENT = DEFAULT_CLUSTER.color

export function getTypeAccent(type: string): string {
  return TYPE_ACCENTS[type] ?? DEFAULT_ACCENT
}

/** Lighter tint per type, for text/badges on a near-black background (trading-card slab). */
export const TYPE_ACCENTS_LIGHT: Record<string, string> = Object.fromEntries(
  CLUSTERS.map(c => [c.typeName, c.colorLight]),
)

const DEFAULT_ACCENT_LIGHT = DEFAULT_CLUSTER.colorLight

export function getTypeAccentLight(type: string): string {
  return TYPE_ACCENTS_LIGHT[type] ?? DEFAULT_ACCENT_LIGHT
}

/**
 * Fixed base note per type — Grok only supplies a short addendum appended
 * after this (see analyzeHandle in lib/grok.ts and its use in the analyze
 * route), so the core diagnosis line never drifts between patients.
 */
export const TYPE_BASE_NOTES: Record<string, string> = Object.fromEntries(
  CLUSTERS.map(c => [c.typeName, c.baseNote]),
)

const DEFAULT_BASE_NOTE = DEFAULT_CLUSTER.baseNote

export function getBaseNote(type: string): string {
  return TYPE_BASE_NOTES[type] ?? DEFAULT_BASE_NOTE
}

export const OFF_RAMP_TEXT =
  'This is satire, not a clinical instrument. If financial loss is genuinely affecting you, help is real and it\'s free — 988 (US) or your local equivalent, any time.'

export const PROJECT_X_HANDLE = 'PTSDshow'

/**
 * TODO(launch): there is no live campaign tweet yet. Once the announcement
 * post goes out from @PTSDshow, replace this ID (and nothing else) — the
 * Like & Retweet and Help Diagnose task links below are built from it.
 */
export const CAMPAIGN_TWEET_ID = 'REPLACE_WITH_REAL_TWEET_ID'
export const CAMPAIGN_TWEET_URL = `https://x.com/${PROJECT_X_HANDLE}/status/${CAMPAIGN_TWEET_ID}`

export const ARTICLE_URL = 'https://x.com/ptsdshow/status/2103600924769796512'

export type SpreadTaskId = 'follow' | 'likeRetweet' | 'shareArticle'

export interface SpreadTask {
  id: SpreadTaskId
  label: string
  description: string
  href: () => string
  /** Opened in a second tab alongside `href`, for tasks that bundle two X actions into one step. */
  secondaryHref?: () => string
}

export const SPREAD_TASKS: SpreadTask[] = [
  {
    id: 'follow',
    label: 'Follow PTSD',
    description: `Follow @${PROJECT_X_HANDLE} on X.`,
    href: () => `https://x.com/intent/follow?screen_name=${PROJECT_X_HANDLE}`,
  },
  {
    id: 'likeRetweet',
    label: 'Like & Retweet',
    description: 'Like and retweet the diagnosis post.',
    href: () => `https://x.com/intent/like?tweet_id=${CAMPAIGN_TWEET_ID}`,
    secondaryHref: () => `https://x.com/intent/retweet?tweet_id=${CAMPAIGN_TWEET_ID}`,
  },
  {
    id: 'shareArticle',
    label: 'Share Article',
    description: 'Share the article so more people get diagnosed.',
    href: () => ARTICLE_URL,
  },
]

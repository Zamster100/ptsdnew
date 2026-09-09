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

const DEFAULT_ACCENT = CLUSTERS[0].color

export function getTypeAccent(type: string): string {
  return TYPE_ACCENTS[type] ?? DEFAULT_ACCENT
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

/**
 * TODO(launch): no article exists yet — replace with the real URL once
 * written, then swap this one constant.
 */
export const ARTICLE_URL = 'https://ptsdshow.com/REPLACE_WITH_REAL_ARTICLE_URL'

export type SpreadTaskId = 'follow' | 'likeRetweet' | 'shareArticle' | 'reply'

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
    href: () =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(ARTICLE_URL)}&text=${encodeURIComponent('This explains everything —')}`,
  },
  {
    id: 'reply',
    label: 'Help Diagnose 2 Friends',
    description: 'Reply and tag two friends who need this diagnosis.',
    href: () => `https://x.com/intent/tweet?in_reply_to=${CAMPAIGN_TWEET_ID}`,
  },
]

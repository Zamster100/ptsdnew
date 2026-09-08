/**
 * Accent colors keyed by the exact type strings Grok is instructed to
 * return (see the SYSTEM_PROMPT in src/lib/grok.ts) — each maps to the
 * cluster color the old questionnaire's equivalent type used, so the
 * card's color language stays the same even though the classification
 * now comes from Grok instead of local scoring.
 */
export const TYPE_ACCENTS: Record<string, string> = {
  'THE HAUNTED': 'var(--color-main-red)',
  'THE BAG HOLDER': 'var(--color-main-cyan)',
  'THE PERMA BEAR': 'var(--color-main-purple)',
  'THE PARANOID DEGEN': 'var(--color-main-yellow)',
  'THE DISCONNECTED': 'var(--color-main-green)',
}

const DEFAULT_ACCENT = 'var(--color-main-red)'

export function getTypeAccent(type: string): string {
  return TYPE_ACCENTS[type] ?? DEFAULT_ACCENT
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }

  return hash
}

/**
 * There's no real quiz score anymore, so this is a cosmetic number derived
 * from the handle — stable across renders/downloads for the same handle,
 * but not a real measurement of anything.
 */
export function placeholderTraumaIndex(handle: string): number {
  return hashString(`trauma:${handle}`) % 9002
}

export const OFF_RAMP_TEXT =
  'This is satire, not a clinical instrument. If financial loss is genuinely affecting you, help is real and it\'s free — 988 (US) or your local equivalent, any time.'

export const PROJECT_X_HANDLE = 'PTSDshow'

/**
 * TODO(launch): there is no live campaign tweet yet. Once the announcement
 * post goes out from @PTSDshow, replace this ID (and nothing else) — every
 * Like/Repost/Reply task link below is built from it.
 */
export const CAMPAIGN_TWEET_ID = 'REPLACE_WITH_REAL_TWEET_ID'
export const CAMPAIGN_TWEET_URL = `https://x.com/${PROJECT_X_HANDLE}/status/${CAMPAIGN_TWEET_ID}`

export type SpreadTaskId = 'follow' | 'like' | 'repost' | 'reply'

export interface SpreadTask {
  id: SpreadTaskId
  label: string
  description: string
  href: () => string
}

export const SPREAD_TASKS: SpreadTask[] = [
  {
    id: 'follow',
    label: 'Follow PTSD',
    description: `Follow @${PROJECT_X_HANDLE} on X.`,
    href: () => `https://x.com/intent/follow?screen_name=${PROJECT_X_HANDLE}`,
  },
  {
    id: 'like',
    label: 'Like the Post',
    description: 'Like the diagnosis post.',
    href: () => `https://x.com/intent/like?tweet_id=${CAMPAIGN_TWEET_ID}`,
  },
  {
    id: 'repost',
    label: 'Retweet the Post',
    description: 'Retweet it so more people get diagnosed.',
    href: () => `https://x.com/intent/retweet?tweet_id=${CAMPAIGN_TWEET_ID}`,
  },
  {
    id: 'reply',
    label: 'Help Diagnose 2 Friends',
    description: 'Reply and tag two friends who need this diagnosis.',
    href: () => `https://x.com/intent/tweet?in_reply_to=${CAMPAIGN_TWEET_ID}`,
  },
]

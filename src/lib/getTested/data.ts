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

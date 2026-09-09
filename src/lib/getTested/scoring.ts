import type { ClusterScores } from './types'

export type BandId = 'untouched' | 'exposed' | 'symptomatic' | 'chronic' | 'terminal' | 'over9000'

interface BandDef {
  id: BandId
  label: string
  max: number
}

/** Thresholds on the 0-100 raw score — same as the original 25-question version. */
const BANDS: BandDef[] = [
  { id: 'untouched', label: 'Untouched', max: 15 },
  { id: 'exposed', label: 'Exposed', max: 35 },
  { id: 'symptomatic', label: 'Symptomatic', max: 55 },
  { id: 'chronic', label: 'Chronic', max: 75 },
  { id: 'terminal', label: 'Terminal', max: 95 },
  { id: 'over9000', label: 'Over 9000', max: 100 },
]

export function getBandLabel(band: BandId): string {
  return BANDS.find(b => b.id === band)?.label ?? band
}

export type BandTier = 'clean' | 'standard' | 'degraded' | 'degradedExtreme'

export function getBandTier(band: BandId): BandTier {
  if (band === 'untouched') return 'clean'
  if (band === 'terminal') return 'degraded'
  if (band === 'over9000') return 'degradedExtreme'

  return 'standard'
}

function bandFromRaw(raw: number): BandId {
  return (BANDS.find(b => raw <= b.max) ?? BANDS[BANDS.length - 1]).id
}

export type ClusterId = keyof ClusterScores

export interface ClusterMeta {
  id: ClusterId
  label: string
  emoji: string
  typeName: string
  color: string
}

/**
 * Exact hex values from the approved v2 card mockup — not site theme tokens.
 * These colors are the source of truth for both the bar chart and
 * `TYPE_ACCENTS` (data.ts derives from this), so the type-name/strip/glow/EKG
 * color and the matching cluster's bar are always the same color.
 */
export const CLUSTERS: ClusterMeta[] = [
  { id: 'A', label: 'Intrusion', emoji: '🕯️', typeName: 'THE HAUNTED', color: '#ff4545' },
  { id: 'B', label: 'Avoidance', emoji: '👻', typeName: 'THE BAG HOLDER', color: '#5aa9ff' },
  { id: 'C', label: 'Cognition', emoji: '🐻', typeName: 'THE PERMA BEAR', color: '#b06bff' },
  { id: 'D', label: 'Hypervigilance', emoji: '👁️', typeName: 'THE PARANOID DEGEN', color: '#ffb020' },
  { id: 'E', label: 'Dissociation', emoji: '💀', typeName: 'THE NUMB', color: '#9aa393' },
]

// Tie-break priority when multiple clusters share the top score (highest wins): E > D > C > B > A.
const TIE_BREAK_ORDER: ClusterId[] = ['E', 'D', 'C', 'B', 'A']

function winningCluster(scores: ClusterScores): ClusterId {
  const max = Math.max(scores.A, scores.B, scores.C, scores.D, scores.E)

  return TIE_BREAK_ORDER.find(id => scores[id] === max) ?? 'A'
}

export interface ComputedResult {
  raw: number
  index: number
  band: BandId
  type: string
}

export function computeFromScores(scores: ClusterScores): ComputedResult {
  const raw = scores.A + scores.B + scores.C + scores.D + scores.E
  const index = Math.min(9001, Math.round(raw * 90.01))
  const band = bandFromRaw(raw)
  const winner = winningCluster(scores)
  const type = CLUSTERS.find(c => c.id === winner)!.typeName

  return { raw, index, band, type }
}

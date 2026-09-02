import { CLUSTERS, CLUSTER_ORDER, ITEMS, BANDS } from './data'
import { Band, BandId, ClusterId, ScoreResult } from './types'

export function scoreItem(selected: number, reverse: boolean): number {
  return reverse ? 4 - selected : selected
}

/**
 * itemAnswers: 10-length array (offset from the full answers array by the
 * 2 intake steps), values may still be null for unanswered items.
 */
export function computePartialRawScore(itemAnswers: (number | null)[]): number {
  return ITEMS.reduce((sum, item, i) => {
    const a = itemAnswers[i]

    return a === null || a === undefined ? sum : sum + scoreItem(a, item.reverse)
  }, 0)
}

export function getPrimaryClusterColor(clusterScores: Record<ClusterId, number>): string {
  const topCluster = CLUSTER_ORDER.reduce((best, id) =>
    clusterScores[id] > clusterScores[best] ? id : best,
  )

  return CLUSTERS[topCluster].color
}

export function getBand(rawScore: number): Band {
  const band = BANDS.find(b => rawScore >= b.minRaw && rawScore <= b.maxRaw)

  return band ?? BANDS[BANDS.length - 1]
}

const TIE_BREAK_PRIORITY: ClusterId[] = ['E', 'D', 'C', 'B', 'A']

export function getResultType(clusterScores: Record<ClusterId, number>): {
  name: string
  typeLine: string
} {
  const maxScore = Math.max(...CLUSTER_ORDER.map(id => clusterScores[id]))
  const winner = TIE_BREAK_PRIORITY.find(id => clusterScores[id] === maxScore)!
  const cluster = CLUSTERS[winner]

  return { name: cluster.resultType, typeLine: cluster.typeLine }
}

/**
 * answers: 10 raw selected values (0-4), in ITEMS order, before reverse adjustment.
 */
export function computeScore(answers: number[]): ScoreResult {
  const clusterScores = { A: 0, B: 0, C: 0, D: 0, E: 0 } as Record<ClusterId, number>

  ITEMS.forEach((item, i) => {
    clusterScores[item.cluster] += scoreItem(answers[i], item.reverse)
  })

  const rawScore = CLUSTER_ORDER.reduce((sum, id) => sum + clusterScores[id], 0)
  const traumaIndex = Math.min(9001, Math.round(rawScore * 225.025))
  const band = getBand(rawScore)
  const { name: resultType, typeLine } = getResultType(clusterScores)
  const malingering = answers.length === 10 && answers.every(a => a === 4)

  return {
    clusterScores,
    rawScore,
    traumaIndex,
    band: band.id as BandId,
    bandLabel: band.label,
    bandCopy: band.copy,
    resultType,
    typeLine,
    malingering,
  }
}

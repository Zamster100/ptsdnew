export type ClusterId = 'A' | 'B' | 'C' | 'D' | 'E'

export interface Cluster {
  id: ClusterId
  name: string
  tagline: string
  color: string
  resultType: string
  typeLine: string
}

export interface ItemStep {
  type: 'item'
  cluster: ClusterId
  text: string
  reverse: boolean
}

export interface IntakeStep {
  type: 'intake'
  key: 'cycle' | 'worst'
  question: string
  options: string[]
}

export type Step = ItemStep | IntakeStep

export type BandId =
  | 'UNTOUCHED'
  | 'EXPOSED'
  | 'SYMPTOMATIC'
  | 'CHRONIC'
  | 'TERMINAL'
  | 'OVER_9000'

export interface Band {
  id: BandId
  label: string
  copy: string
  minRaw: number
  maxRaw: number
}

export interface ScoreResult {
  clusterScores: Record<ClusterId, number>
  rawScore: number
  traumaIndex: number
  band: BandId
  bandLabel: string
  bandCopy: string
  resultType: string
  typeLine: string
  malingering: boolean
}

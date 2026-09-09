import type { BandId } from './scoring'

export interface ClusterScores {
  A: number
  B: number
  C: number
  D: number
  E: number
}

export interface GrokAnalysis {
  scores: ClusterScores
  note: string
  worst: string
}

export interface DiagnosisResult {
  id: number
  patientNo: string
  handle: string
  type: string
  note: string
  worst: string
  scores: ClusterScores
  traumaIndex: number
  band: BandId
  memberSince: number | null
}

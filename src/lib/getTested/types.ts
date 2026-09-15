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
  /** Short addendum only — the fixed base note per type is added separately, see getBaseNote. */
  detail: string
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
  /** Client-only: picked once at diagnosis time via getRandomPatientPhoto, not sent by the API. */
  photoUrl?: string
}

import { DiagnosisResult } from './types'

const STORAGE_KEY = 'ptsd25_diagnosis_flow'

export type ResumableStage = 'result' | 'claim' | 'confirmation'

export interface StoredFlowState {
  stage: ResumableStage
  result: DiagnosisResult
  shared: boolean
}

/**
 * Only 'result' | 'claim' | 'confirmation' are worth resuming — those are
 * the stages reached AFTER the paid Grok call already completed. A refresh
 * during 'intake' or 'wait' just restarts, since the in-flight request from
 * the old page context is gone either way.
 */
export function saveFlowState(state: StoredFlowState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage can throw (private mode, quota) — resuming is a nice-to-have, not critical
  }
}

export function loadFlowState(): StoredFlowState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<StoredFlowState>
    if (
      (parsed.stage !== 'result' && parsed.stage !== 'claim' && parsed.stage !== 'confirmation') ||
      !parsed.result ||
      typeof parsed.result.id !== 'number'
    ) {
      return null
    }

    return parsed as StoredFlowState
  } catch {
    return null
  }
}

export function clearFlowState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

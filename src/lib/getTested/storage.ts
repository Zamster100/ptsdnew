import { SpreadTaskId } from './data'
import { DiagnosisResult } from './types'

const STORAGE_KEY = 'ptsd25_diagnosis_flow'

const SPREAD_TASK_IDS: SpreadTaskId[] = ['follow', 'likeRetweet', 'shareArticle', 'reply']

export type ResumableStage = 'result' | 'spread' | 'claim' | 'confirmation'

const RESUMABLE_STAGES: ResumableStage[] = ['result', 'spread', 'claim', 'confirmation']

export interface StoredFlowState {
  stage: ResumableStage
  result: DiagnosisResult
  shared: boolean
  openedTasks: SpreadTaskId[]
}

/**
 * Only 'result' | 'spread' | 'claim' | 'confirmation' are worth resuming —
 * those are the stages reached AFTER the paid Grok call already completed. A
 * refresh during 'intake' or 'wait' just restarts, since the in-flight
 * request from the old page context is gone either way.
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
    const stage = parsed.stage
    const isValidStage = (s: unknown): s is ResumableStage => RESUMABLE_STAGES.includes(s as ResumableStage)

    if (!isValidStage(stage) || !parsed.result || typeof parsed.result.id !== 'number') {
      return null
    }

    // Entries saved before the spread-tasks feature existed won't have this
    // field at all — default to none-opened rather than rejecting the record.
    const openedTasks = Array.isArray(parsed.openedTasks)
      ? parsed.openedTasks.filter((id): id is SpreadTaskId => SPREAD_TASK_IDS.includes(id as SpreadTaskId))
      : []

    return { stage, result: parsed.result, shared: Boolean(parsed.shared), openedTasks }
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

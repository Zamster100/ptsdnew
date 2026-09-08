'use client'

import { cn } from '@/lib/utils'
import { SPREAD_TASKS, SpreadTaskId } from '@/lib/getTested/data'
import { CornerStamp } from './CornerStamp'

interface SpreadStepProps {
  openedTasks: SpreadTaskId[]
  onTaskOpened: (id: SpreadTaskId) => void
  onContinue: () => void
}

export const SpreadStep = ({ openedTasks, onTaskOpened, onContinue }: SpreadStepProps) => {
  const allOpened = SPREAD_TASKS.every(t => openedTasks.includes(t.id))

  function handleOpen(taskId: SpreadTaskId, href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
    onTaskOpened(taskId)
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left md:p-10">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ticket-red via-main-yellow to-ticket-red" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ticket-red/20 blur-3xl" />

        <CornerStamp label="Step 2 / 3" />

        <h2 className="font-manrope mb-3 text-2xl font-black uppercase leading-tight text-white md:text-3xl">
          Spread the Signal
        </h2>
        <p className="font-manrope mb-6 max-w-lg text-sm leading-[1.7] text-light-text">
          A diagnosis this bad doesn&apos;t stay contained. Open every task below to carry it further — eligibility
          only needs the full chart, not a specific result.
        </p>

        <ul className="mb-4 flex flex-col gap-2">
          {SPREAD_TASKS.map(task => {
            const opened = openedTasks.includes(task.id)

            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => handleOpen(task.id, task.href())}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors',
                    opened ? 'border-ticket-red/40 bg-ticket-red/5' : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]',
                      opened ? 'border-ticket-red bg-ticket-red text-white' : 'border-white/20 text-white/30',
                    )}
                  >
                    {opened ? '✓' : ''}
                  </span>

                  <span className="flex-1">
                    <span className="font-manrope block text-sm font-bold text-white">{task.label}</span>
                    <span className="font-manrope block text-xs text-light-text">{task.description}</span>
                  </span>

                  <span className="shrink-0 font-mono text-xs text-white/30">↗</span>
                </button>
              </li>
            )
          })}
        </ul>

        <p className="font-mono mb-8 text-[10px] uppercase leading-relaxed tracking-widest text-white/30">
          Opening a task marks the link as opened, not the action as verified. Tag two real accounts in your reply —
          bots don&apos;t count as friends.
        </p>

        <button
          type="button"
          onClick={onContinue}
          disabled={!allOpened}
          className="font-manrope w-full rounded-xl bg-ticket-red px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 md:w-auto"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

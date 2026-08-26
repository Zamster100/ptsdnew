import { Metadata } from 'next'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { QuizFlow } from '@/components/sections/GetTested/QuizFlow'
import { GetTestedGate } from '@/components/sections/GetTested/GetTestedGate'

export const metadata: Metadata = {
  title: 'PTSD | Get Tested',
  description:
    'PTSD-25 — a 25-question diagnostic self-assessment for anyone who has ever held too long, bought the top, or been rugged. Find your trauma index.',
}

export default function GetTestedPage() {
  return (
    <GetTestedGate>
      <div className="min-h-screen bg-black">
        <TicketsHeader />
        <QuizFlow />
      </div>
    </GetTestedGate>
  )
}

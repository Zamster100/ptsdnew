import { Metadata } from 'next'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { DiagnosisFlow } from '@/components/sections/GetTested/DiagnosisFlow'
import { GetTestedGate } from '@/components/sections/GetTested/GetTestedGate'

export const metadata: Metadata = {
  title: 'PTSD | Get Tested',
  description:
    'PTSD-25 — hand over your X handle and we analyze your actual posts to diagnose exactly how held, hunted, and haunted you really are.',
}

export default function GetTestedPage() {
  return (
    <GetTestedGate>
      <div className="min-h-screen bg-black">
        <TicketsHeader />
        <DiagnosisFlow />
      </div>
    </GetTestedGate>
  )
}

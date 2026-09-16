import { Metadata } from 'next'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { DiagnosisFlow } from '@/components/sections/GetTested/DiagnosisFlow'

export const metadata: Metadata = {
  title: 'PTSD | Get Tested',
  description:
    'PTSD — hand over your X handle and we analyze your actual posts to diagnose exactly how held, hunted, and haunted you really are.',
}

export default function GetTestedPage() {
  return (
    <div className="min-h-screen bg-black">
      <TicketsHeader />
      <DiagnosisFlow />
    </div>
  )
}

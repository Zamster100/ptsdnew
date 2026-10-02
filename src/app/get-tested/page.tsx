import { Metadata } from 'next'
import { GetTestedGate } from '@/components/sections/GetTested/GetTestedGate'

export const metadata: Metadata = {
  title: 'PTSD | Get Tested',
  description: 'The PTSD diagnosis is over. Our evaluators are on break. Winners will be announced soon.',
}

export default function GetTestedPage() {
  return <GetTestedGate />
}

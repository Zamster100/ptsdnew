import { CornerStamp } from './CornerStamp'

interface ConfirmationStepProps {
  patientNo: string
}

export const ConfirmationStep = ({ patientNo }: ConfirmationStepProps) => (
  <div className="mx-auto w-full max-w-3xl">
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center md:p-10">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ticket-red via-main-yellow to-ticket-red" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ticket-red/20 blur-3xl" />

      <CornerStamp label="Confirmed" />

      <h2 className="font-manrope mb-3 text-2xl font-black uppercase leading-tight text-white md:text-3xl">
        You&apos;re in the Queue
      </h2>
      <p className="font-manrope mx-auto mb-6 max-w-md text-sm leading-[1.7] text-light-text">
        Winners announced in 72 hours.
      </p>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        Patient No. {patientNo}
      </p>
    </div>
  </div>
)

import Image from 'next/image'
import Link from 'next/link'

/** Contest is over — this replaces the diagnosis flow on /get-tested. */
export function GetTestedGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Image
          src="/images/hero/logo.png"
          alt="PTSD"
          width={80}
          height={80}
          className="w-16 object-contain opacity-90"
        />

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-main-yellow">
            Degens Anonymous Institute &middot; Get Tested
          </p>
          <h1 className="font-manrope mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-white md:text-4xl">
            The Clinic Is Closed
          </h1>
          <p className="mt-4 text-base leading-[1.7] text-light-text">
            Testing is over. Our evaluators have clocked out, turned off the charts, and are staring at the
            ceiling. Some are crying into a cold coffee. None are taking new patients.
          </p>
        </div>

        <div className="w-full rounded-xl border border-main-yellow/30 bg-main-yellow/[0.06] px-5 py-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-main-yellow">Results day</p>
          <p className="font-manrope mt-2 text-lg font-black leading-snug text-white">
            Guaranteed winners of the 500 WL spots will be disclosed on October 2, 2026.
          </p>
        </div>

        <Link
          href="/"
          className="w-full rounded-lg bg-ticket-red py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>

        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
          Results are final. Please do not ask the evaluators how they&apos;re feeling.
        </p>
      </div>
    </div>
  )
}

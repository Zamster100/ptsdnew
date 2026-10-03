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

        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-base leading-[1.7] text-light-text">
            Dying to know who won the 500 guaranteed spots? The evaluators won&apos;t say, and honestly, they
            can&apos;t look you in the eye. Smash the big green button and find out.
          </p>
          <Link
            href="/whitelist"
            className="w-full rounded-lg bg-emerald-500 py-4 text-base font-black uppercase tracking-wide text-black transition-opacity hover:opacity-90"
          >
            Did I Win?
          </Link>
          <Link
            href="/"
            className="font-manrope text-xs font-bold text-white/50 underline underline-offset-4 transition-colors hover:text-white"
          >
            Back to Home
          </Link>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
          Results are final. Please do not ask the evaluators how they&apos;re feeling.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { TicketsHeader } from '@/components/sections/TicketsPage/TicketsHeader'
import { TicketRain } from '@/components/shared/TicketRain'

const ETH_RE = /^0x[a-fA-F0-9]{40}$/
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

type Category = 'presale' | 'guaranteed' | 'fcfs'
type BackgroundKey = 'idle' | 'notfound' | Category

interface Entry {
  category: Category
  price: number
  quantity: number
}

type Status = 'idle' | 'loading' | 'found' | 'not-found' | 'error'

/** Desktop is the wide art, mobile the portrait art. 'idle' on desktop is the looping video instead. */
const BACKGROUNDS: Record<BackgroundKey, { desktop: string; mobile: string }> = {
  idle: { desktop: '/images/raffle/raffle-poster.jpg', mobile: '/images/raffle/mraffle.jpg' },
  notfound: { desktop: '/images/raffle/notwl.jpg', mobile: '/images/raffle/mnotw.jpg' },
  presale: { desktop: '/images/raffle/presale.jpg', mobile: '/images/raffle/mpreslae.jpg' },
  guaranteed: { desktop: '/images/raffle/gtw.jpg', mobile: '/images/raffle/mgtw.jpg' },
  fcfs: { desktop: '/images/raffle/fcfs.jpg', mobile: '/images/raffle/mfcfs.jpg' },
}

const CATEGORY_LABELS: Record<Category, string> = {
  presale: 'Presale',
  guaranteed: 'Guaranteed WL',
  fcfs: 'FCFS',
}

const RAIN_IMAGES = ['blue', 'gold', 'green', 'orange', 'red'].map(c => `/images/Tickets/small/${c}.png`)

const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export default function WhitelistPage() {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [entry, setEntry] = useState<Entry | null>(null)
  const [error, setError] = useState('')
  // Bumped on every successful find so the rain remounts and replays, even for the same wallet.
  const [rainKey, setRainKey] = useState(0)

  const isValid = ETH_RE.test(input.trim()) || SOL_RE.test(input.trim())

  const activeBackground: BackgroundKey =
    status === 'found' && entry ? entry.category : status === 'not-found' ? 'notfound' : 'idle'

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    const wallet = input.trim()
    if (!isValid || status === 'loading') return
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(`/api/whitelist?wallet=${encodeURIComponent(wallet)}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Lookup failed')
        setStatus('error')

        return
      }
      setEntry(json.entry ?? null)
      setStatus(json.whitelisted ? 'found' : 'not-found')
      if (json.whitelisted && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setRainKey(k => k + 1)
      }
    } catch {
      setError('Network error — please try again')
      setStatus('error')
    }
  }

  return (
    <div className="relative h-dvh min-h-[560px] w-full overflow-hidden bg-black font-sans text-white">
      {/* Background stack — every layer stays mounted so swaps are an instant crossfade, no loading flash. */}
      {(Object.keys(BACKGROUNDS) as BackgroundKey[]).map(key => (
        <div
          key={key}
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: activeBackground === key ? 1 : 0 }}
        >
          {key === 'idle' ? (
            <video
              src="/videos/ptsdraffle-web.mp4"
              poster={BACKGROUNDS.idle.desktop}
              autoPlay
              muted
              loop
              playsInline
              className="hidden h-full w-full object-cover md:block"
            />
          ) : (
            <img src={BACKGROUNDS[key].desktop} alt="" className="hidden h-full w-full object-cover md:block" />
          )}
          <img src={BACKGROUNDS[key].mobile} alt="" className="h-full w-full object-cover md:hidden" />
        </div>
      ))}

      {/* Soft fade so the box and results stay readable over any artwork. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

      {rainKey > 0 && (
        <TicketRain
          key={rainKey}
          images={RAIN_IMAGES}
          count={90}
          staggerMs={40}
          baseWidth={72}
          speed={1.5}
          keepAspect
        />
      )}

      <TicketsHeader />

      {/* Box sits ~20% above the page bottom; results fill the strip beneath it. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-[15px] md:px-[60px]">
        <form onSubmit={handleCheck} className="w-full max-w-2xl">
          <div className="flex w-full items-center gap-2 rounded-full border border-white/20 bg-black/60 py-2 pl-5 pr-2 backdrop-blur-md transition-colors focus-within:border-ticket-red/70 md:py-3 md:pl-7">
            <input
              type="text"
              value={input}
              onChange={e => {
                setInput(e.target.value)
                setStatus('idle')
              }}
              placeholder="Enter wallet"
              spellCheck={false}
              autoComplete="off"
              aria-label="Wallet address"
              className="min-w-0 flex-1 bg-transparent font-mono text-base text-white placeholder-white/40 outline-none md:text-xl"
            />
            <button
              type="submit"
              disabled={!isValid || status === 'loading'}
              className="shrink-0 rounded-full bg-ticket-red px-5 py-3 font-manrope text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 md:px-8 md:py-4 md:text-base"
            >
              {status === 'loading' ? 'Checking…' : 'Check'}
            </button>
          </div>
        </form>

        <div className="flex h-[20dvh] min-h-[130px] w-full max-w-2xl items-start justify-center pt-4">
          {status === 'error' && <p className="font-mono text-xs text-ticket-red">{error}</p>}

          {status === 'found' && entry && (
            <div className="w-full rounded-2xl border border-white/15 bg-black/65 px-5 py-3 backdrop-blur-md">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-main-yellow">
                {CATEGORY_LABELS[entry.category]}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <Stat label="Mints" value={String(entry.quantity)} />
                <Stat label="Price each" value={entry.price > 0 ? usd(entry.price) : 'Paid'} />
                <Stat label="Total" value={entry.price > 0 ? usd(entry.price * entry.quantity) : 'Paid'} />
              </div>
            </div>
          )}

          {status === 'not-found' && (
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">
              This wallet isn&apos;t on the whitelist.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</p>
    <p className="font-manrope text-xl font-black tabular-nums text-white md:text-2xl">{value}</p>
  </div>
)

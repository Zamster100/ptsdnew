'use client'

import { useState, useEffect, ReactNode, FormEvent } from 'react'
import Image from 'next/image'

// Fixed instant in time (ISO with explicit UTC offset), so every viewer
// counts down to the same moment regardless of their local timezone.
const UNLOCK_AT = new Date('2026-09-28T12:00:00-04:00')

// Lets the team preview the page early for manual testing without moving
// UNLOCK_AT. Client-side only (same pattern as TicketsGate) — fine for a
// soft testing bypass, not meant to be a real secret.
const BYPASS_STORAGE_KEY = 'ptsd_get_tested_test_access'
const BYPASS_PASSWORD = 'trauma2026'

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, UNLOCK_AT.getTime() - Date.now())
  const totalSeconds = Math.floor(diff / 1000)

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function GetTestedGate({ children }: { children: ReactNode }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [bypassed, setBypassed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  useEffect(() => {
    if (window.sessionStorage.getItem(BYPASS_STORAGE_KEY) === '1') setBypassed(true)
    setTimeLeft(getTimeLeft())
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000)

    return () => clearInterval(id)
  }, [])

  // Avoid a hydration mismatch: render nothing until the client has computed
  // the real countdown from its own clock.
  if (!timeLeft) return null

  const timeUnlocked =
    timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0

  if (timeUnlocked || bypassed) return <>{children}</>

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (passwordInput === BYPASS_PASSWORD) {
      window.sessionStorage.setItem(BYPASS_STORAGE_KEY, '1')
      setBypassed(true)
    } else {
      setPasswordError(true)
      setPasswordInput('')
    }
  }

  const units: { label: string; value: number }[] = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Image
          src="/images/hero/logo.png"
          alt="PTSD"
          width={80}
          height={80}
          className="w-16 object-contain opacity-90"
        />

        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-main-yellow">
            PTSD Show &middot; Get Tested
          </p>
          <h1 className="font-manrope mt-3 text-2xl font-black tracking-tight text-white">
            Not Open Yet
          </h1>
          <p className="mt-3 text-base font-semibold text-light-text">
            Opens September 28, 12:00 PM ET
          </p>
        </div>

        <div className="grid w-full grid-cols-4 gap-2">
          {units.map((u) => (
            <div
              key={u.label}
              className="flex flex-col items-center rounded-lg bg-light-bg py-4"
            >
              <span className="font-manrope text-3xl font-black tabular-nums text-white">
                {pad(u.value)}
              </span>
              <span className="font-mono mt-1 text-[10px] uppercase tracking-widest text-light-text">
                {u.label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex w-full flex-col gap-2">
          <input
            type="password"
            value={passwordInput}
            onChange={e => {
              setPasswordInput(e.target.value)
              setPasswordError(false)
            }}
            placeholder="Testing password"
            className="w-full rounded-lg border border-white/10 bg-light-bg px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/30"
          />
          {passwordError && (
            <p className="text-center text-xs text-ticket-red">Incorrect password.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-ticket-red py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Unlock Early
          </button>
        </form>
      </div>
    </div>
  )
}

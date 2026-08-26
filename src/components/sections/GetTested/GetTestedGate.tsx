'use client'

import { useState, useEffect, ReactNode } from 'react'
import Image from 'next/image'

const STORAGE_KEY = 'ptsd_get_tested_access'
const PASSWORD = 'gettested'

export function GetTestedGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (window.sessionStorage.getItem(STORAGE_KEY) === '1') {
      setUnlocked(true)
    }
    setChecked(true)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === PASSWORD) {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  if (!checked) return null

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Image
          src="/images/hero/logo.png"
          alt="PTSD"
          width={80}
          height={80}
          className="w-16 object-contain opacity-90"
        />

        <div className="text-center">
          <h1 className="text-white text-2xl font-bold tracking-tight">Private Access Only</h1>
          <p className="text-white/50 text-sm mt-2">Enter the access password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/30 transition-colors"
          />
          {error && (
            <p className="text-red-400 text-xs text-center">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full bg-white text-black font-semibold text-sm rounded-lg py-3 hover:bg-white/90 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

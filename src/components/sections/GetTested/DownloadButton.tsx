'use client'

import { RefObject, useState } from 'react'
import { toPng } from 'html-to-image'

interface DownloadButtonProps {
  targetRef: RefObject<HTMLDivElement | null>
  filename: string
}

export const DownloadButton = ({ targetRef, filename }: DownloadButtonProps) => {
  const [busy, setBusy] = useState(false)

  async function handleDownload() {
    if (!targetRef.current || busy) return
    setBusy(true)
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      const dataUrl = await toPng(targetRef.current, { pixelRatio: 2 })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      link.click()
    } catch (err) {
      console.error('[get-tested] PNG export failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="font-manrope w-full max-w-md rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors duration-150 hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? 'Preparing…' : 'Download Chart'}
    </button>
  )
}

const ETH_RE = /^0x[a-fA-F0-9]{40}$/

interface WhitelistCache {
  ethMap: Map<string, number>
  rawMap: Map<string, number>
  fetchedAt: number
}

export interface WhitelistResult {
  whitelisted: boolean
  quantity: number
}

let cache: WhitelistCache | null = null
const CACHE_TTL_MS = 60 * 1000

async function fetchWhitelist(): Promise<WhitelistCache> {
  const sheetId = process.env.GOOGLE_SHEETS_ID
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'Sheet1!A:B'

  if (!sheetId || !apiKey) {
    throw new Error(
      'Google Sheets is not configured (missing GOOGLE_SHEETS_ID or GOOGLE_SHEETS_API_KEY)',
    )
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Sheets fetch failed (${res.status}): ${body}`)
  }

  const json = (await res.json()) as { values?: string[][] }
  const rows = json.values ?? []

  const ethMap = new Map<string, number>()
  const rawMap = new Map<string, number>()

  for (const row of rows) {
    const value = row[0]?.trim()
    if (!value) continue
    const quantity = Number(row[1]?.trim())
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1

    rawMap.set(value, safeQuantity)
    if (ETH_RE.test(value)) ethMap.set(value.toLowerCase(), safeQuantity)
  }

  return { ethMap, rawMap, fetchedAt: Date.now() }
}

async function getWhitelist(): Promise<WhitelistCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache
  }
  cache = await fetchWhitelist()

  return cache
}

export async function checkWhitelist(wallet: string): Promise<WhitelistResult> {
  const { ethMap, rawMap } = await getWhitelist()
  const trimmed = wallet.trim()

  // SOL addresses are base58 and case-sensitive — match exactly as entered in the sheet.
  const quantity = ETH_RE.test(trimmed)
    ? ethMap.get(trimmed.toLowerCase())
    : rawMap.get(trimmed)

  return { whitelisted: quantity !== undefined, quantity: quantity ?? 0 }
}

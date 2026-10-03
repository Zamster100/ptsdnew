const ETH_RE = /^0x[a-fA-F0-9]{40}$/

export type WhitelistCategory = 'presale' | 'guaranteed' | 'fcfs'

export interface WhitelistEntry {
  category: WhitelistCategory
  /** Price per mint in USD. */
  price: number
  quantity: number
}

export interface WhitelistResult {
  whitelisted: boolean
  /** Highest-priority entry for the wallet (presale > guaranteed > fcfs); null when not found. */
  entry: WhitelistEntry | null
}

interface WhitelistCache {
  ethMap: Map<string, WhitelistEntry>
  rawMap: Map<string, WhitelistEntry>
  fetchedAt: number
}

// Highest priority first — a wallet on several rows resolves to the best category.
const CATEGORY_PRIORITY: WhitelistCategory[] = ['presale', 'guaranteed', 'fcfs']

let cache: WhitelistCache | null = null
const CACHE_TTL_MS = 60 * 1000

/** The sheet has typos ("Gauranteed", "FCFC") — match loosely rather than exactly. */
function parseCategory(raw: string | undefined): WhitelistCategory | null {
  const value = (raw ?? '').trim().toLowerCase()
  if (value.startsWith('presale')) return 'presale'
  if (value.startsWith('ga') || value.startsWith('gu') || value.startsWith('gtw')) return 'guaranteed'
  if (value.startsWith('fcf')) return 'fcfs'

  return null
}

function parseNumber(raw: string | undefined): number | null {
  const n = Number((raw ?? '').replace(/[$,\s]/g, ''))

  return Number.isFinite(n) ? n : null
}

function priorityOf(entry: WhitelistEntry): number {
  return CATEGORY_PRIORITY.indexOf(entry.category)
}

/**
 * A wallet can have several rows. The best category wins; rows in that same category are separate
 * purchases/allocations, so their quantities add up (price is uniform within a category).
 */
function keepBest(map: Map<string, WhitelistEntry>, key: string, entry: WhitelistEntry) {
  const current = map.get(key)
  if (!current || priorityOf(entry) < priorityOf(current)) {
    map.set(key, entry)
  } else if (entry.category === current.category) {
    map.set(key, { ...current, quantity: current.quantity + entry.quantity })
  }
}

async function fetchWhitelist(): Promise<WhitelistCache> {
  const sheetId = process.env.GOOGLE_SHEETS_ID
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'Sheet1!A:D'

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
  const [header = [], ...rows] = json.values ?? []

  // Locate columns by header name so reordering the sheet can't silently break lookups.
  const col = (name: string, fallback: number) => {
    const i = header.findIndex(h => h.trim().toLowerCase() === name)

    return i === -1 ? fallback : i
  }
  const categoryCol = col('category', 0)
  const walletCol = col('wallet', 1)
  const priceCol = col('price', 2)
  const quantityCol = col('quantity', 3)

  const ethMap = new Map<string, WhitelistEntry>()
  const rawMap = new Map<string, WhitelistEntry>()

  for (const row of rows) {
    const wallet = row[walletCol]?.trim()
    const category = parseCategory(row[categoryCol])
    if (!wallet || !category) continue

    const quantity = parseNumber(row[quantityCol])
    const entry: WhitelistEntry = {
      category,
      price: parseNumber(row[priceCol]) ?? 0,
      quantity: quantity !== null && quantity > 0 ? quantity : 1,
    }

    keepBest(rawMap, wallet, entry)
    if (ETH_RE.test(wallet)) keepBest(ethMap, wallet.toLowerCase(), entry)
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
  const entry = (ETH_RE.test(trimmed) ? ethMap.get(trimmed.toLowerCase()) : rawMap.get(trimmed)) ?? null

  return { whitelisted: entry !== null, entry }
}

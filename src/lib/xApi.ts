const X_API_URL = 'https://api.x.com/2/users/by/username'

interface XUserResponse {
  data?: { created_at?: string }
}

/**
 * Real, factual account-creation year — no inference, no fallback guessing.
 * Any failure (missing token, rate limit, invalid handle, network error)
 * resolves to null so the caller can omit the field rather than show a
 * placeholder.
 */
export async function getMemberSinceYear(handle: string): Promise<number | null> {
  const token = process.env.X_BEARER_TOKEN
  if (!token) {
    console.error('[x-api] X_BEARER_TOKEN is not set')

    return null
  }

  try {
    const res = await fetch(`${X_API_URL}/${encodeURIComponent(handle)}?user.fields=created_at`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      console.error('[x-api] API error:', res.status, await res.text())

      return null
    }

    const data = (await res.json()) as XUserResponse
    const createdAt = data.data?.created_at
    if (!createdAt) return null

    const year = new Date(createdAt).getFullYear()

    return Number.isFinite(year) ? year : null
  } catch (err) {
    console.error('[x-api] member-since lookup failed:', err)

    return null
  }
}

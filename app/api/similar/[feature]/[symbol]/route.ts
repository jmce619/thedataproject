// app/api/similar/[feature]/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!
const ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY

// These may be *index names* OR full *host URLs*
const INDEX_LOCATORS: Record<string, string | undefined> = {
  description: process.env.PINECONE_DESCRIPTION_INDEX_URL,
  financials: process.env.PINECONE_FINANCIALS_INDEX_URL,
  'price-volume': process.env.PINECONE_PRICE_VOLUME_INDEX_URL,
}

const pc = new Pinecone({ apiKey: PINECONE_API_KEY })

/** Convert an index host URL to an index *name*; if already a name, return as-is. */
function resolveIndexName(locator?: string): string {
  if (!locator) throw new Error('Missing Pinecone index locator')
  if (!locator.startsWith('http')) return locator.trim()

  try {
    const u = new URL(locator)
    const subdomain = u.hostname.split('.')[0] // e.g. "company-financials-xxxxxx"
    const parts = subdomain.split('-')
    if (parts.length >= 2) {
      parts.pop() // drop trailing project/hash segment
      return parts.join('-')
    }
    return subdomain
  } catch {
    const host = locator.replace(/^https?:\/\//, '').split('/')[0]
    const sub = host.split('.')[0]
    const parts = sub.split('-')
    if (parts.length >= 2) {
      parts.pop()
      return parts.join('-')
    }
    return sub
  }
}

function getIndexForFeature(feature: 'description' | 'financials' | 'price-volume') {
  const name = resolveIndexName(INDEX_LOCATORS[feature])
  return pc.index(name) // SDK expects the *name*
}

/* ---------------- Helpers: company key, logos, de-dupe ---------------- */

function stripCompanySuffixes(name: string) {
  if (!name) return ''
  let n = name.trim()
  n = n.replace(/\bClass\s+[A-Z]\b/gi, '').replace(/\bCl(?:ass)?\s*[A-Z]\b/gi, '')
  n = n.replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|LLC|Co\.?|Ltd\.?|PLC|S\.?A\.?|N\.?V\.?)$/gi, '')
  return n.trim()
}

type Enriched = {
  id: string
  score: number
  description: string
  logoUrl: string | null
  name?: string
  companyKey?: string
  volume?: number
}

async function fetchOverviewName(symbol: string): Promise<string | null> {
  if (!ALPHA_KEY) return null
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_KEY}`,
      { cache: 'no-store' }
    )
    const j = await res.json()
    return j?.Name || null
  } catch {
    return null
  }
}

async function fetchDailyVolume(symbol: string): Promise<number | undefined> {
  if (!ALPHA_KEY) return undefined
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_KEY}`,
      { cache: 'no-store' }
    )
    const j = await res.json()
    const vol = j?.['Global Quote']?.['06. volume']
    const n = vol ? Number(vol) : NaN
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

function shareClassRank(ticker: string): number {
  const t = ticker.toUpperCase()
  // BRK.A / BRK.B style
  const dot = t.match(/\.([A-Z])$/)
  if (dot) {
    const cls = dot[1]
    if (cls === 'A') return 0
    if (cls === 'B') return 1
    if (cls === 'C') return 2
  }
  // Alphabet special-case
  if (t === 'GOOGL') return 0 // A
  if (t === 'GOOG') return 2 // C
  // Generic last-letter fallback
  const end = t.match(/[A-Z]$/)?.[0]
  if (end === 'A') return 0
  if (end === 'B') return 1
  if (end === 'C') return 2
  return 5
}

async function pickPrimaryByVolume(cands: Enriched[]): Promise<Enriched> {
  await Promise.all(
    cands.map(async (c) => {
      if (typeof c.volume === 'undefined') c.volume = await fetchDailyVolume(c.id)
    })
  )
  const sorted = [...cands].sort((a, b) => {
    const va = typeof a.volume === 'number' ? a.volume! : -1
    const vb = typeof b.volume === 'number' ? b.volume! : -1
    if (vb !== va) return vb - va // higher volume first
    return shareClassRank(a.id) - shareClassRank(b.id) // A > B > C
  })
  return sorted[0]
}

async function getLogoUrlForName(name: string | null): Promise<string | null> {
  if (!name) return null
  try {
    const stripped = stripCompanySuffixes(name)
    const cbRes = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(stripped)}`,
      { cache: 'no-store' }
    )
    const suggestions = await cbRes.json()
    if (Array.isArray(suggestions) && suggestions.length > 0 && suggestions[0].domain) {
      return `https://logo.clearbit.com/${suggestions[0].domain}`
    }
  } catch {}
  return null
}

/** Safely coerce unknown metadata values to a string */
function toStringSafe(val: unknown): string {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(toStringSafe).join(' ')
  if (val == null) return ''
  try {
    return String(val)
  } catch {
    return ''
  }
}

/** Safely coerce score to a finite number (defaults to 0) */
function toNumberSafe(val: unknown, fallback = 0): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

/* ---------------------------- Route handler ---------------------------- */

export async function GET(
  _request: NextRequest,
  { params }: { params: { feature: string; symbol: string } }
) {
  const feature = (params.feature || '').toLowerCase() as 'description' | 'financials' | 'price-volume'
  const symbol = params.symbol?.toUpperCase()

  if (!symbol) return NextResponse.json({ error: 'No symbol provided' }, { status: 400 })
  if (!['description', 'financials', 'price-volume'].includes(feature)) {
    return NextResponse.json({ error: `Unknown feature '${feature}'` }, { status: 400 })
  }

  try {
    const index = getIndexForFeature(feature)

    // 1) Get the base vector in the selected feature space
    const fetchResult = await index.fetch([symbol])
    const vectorData = (fetchResult as any).records?.[symbol]
    if (!vectorData?.values?.length) {
      return NextResponse.json({ error: 'No embedding found for symbol' }, { status: 404 })
    }

    // 2) Query similars within that feature space
    const queryResult = await index.query({
      vector: vectorData.values,
      topK: 16,
      includeMetadata: true,
    })

    const raw = (queryResult.matches || [])
      .filter((m: any) => m.id !== symbol)
      .slice(0, 15)

    // 3) Enrich with Name->companyKey and logo
    const enriched: Enriched[] = []
    for (const m of raw as any[]) {
      const name = await fetchOverviewName(m.id)
      const companyKey = name ? stripCompanySuffixes(name) : undefined
      const logoUrl = await getLogoUrlForName(name)
      enriched.push({
        id: m.id,
        score: toNumberSafe(m.score, 0),                               // ensure number
        description: toStringSafe(m.metadata?.description ?? ''),       // ensure string
        logoUrl,
        name: name || undefined,
        companyKey,
      })
    }

    // 4) If any similar collides with the base company, include base as a candidate
    const baseName = await fetchOverviewName(symbol)
    const baseKey = baseName ? stripCompanySuffixes(baseName) : undefined

    const groups = new Map<string, Enriched[]>()
    for (const item of enriched) {
      const key = item.companyKey || item.id
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    if (baseKey && groups.has(baseKey)) {
      groups.get(baseKey)!.push({
        id: symbol,
        score: 1,
        description: '',
        logoUrl: await getLogoUrlForName(baseName),
        name: baseName || undefined,
        companyKey: baseKey,
      })
    }

    // 5) Pick one share class per company (by volume; tie-break class rank)
    const deduped: Enriched[] = []
    const groupValues = Array.from(groups.values()) // <-- avoid MapIterator in for-of
    for (let i = 0; i < groupValues.length; i++) {
      const cands = groupValues[i]
      if (cands.length === 1) {
        deduped.push(cands[0])
      } else {
        const primary = await pickPrimaryByVolume(cands)
        if (primary.id !== symbol) deduped.push(primary)
      }
    }

    // 6) Sort by similarity score, trim to 10, return unified shape
    deduped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const result = deduped.slice(0, 10).map(d => ({
      id: d.id,
      score: d.score,
      description: d.description,
      logoUrl: d.logoUrl,
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Similar route error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

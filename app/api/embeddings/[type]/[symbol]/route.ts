// app/api/embeddings/[type]/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Util: Check for required env vars and log them (don't print secrets)
function checkEnv() {
  const missing: string[] = []
  const envSummary: Record<string, any> = {
    PINECONE_API_KEY: !!process.env.PINECONE_API_KEY, // don't log the actual key!
    PINECONE_DESCRIPTION_INDEX_URL: process.env.PINECONE_DESCRIPTION_INDEX_URL,
    PINECONE_FINANCIALS_INDEX_URL: process.env.PINECONE_FINANCIALS_INDEX_URL,
    PINECONE_PRICE_VOLUME_INDEX_URL: process.env.PINECONE_PRICE_VOLUME_INDEX_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  }
  if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY')
  if (!process.env.PINECONE_DESCRIPTION_INDEX_URL) missing.push('PINECONE_DESCRIPTION_INDEX_URL')
  if (!process.env.PINECONE_FINANCIALS_INDEX_URL) missing.push('PINECONE_FINANCIALS_INDEX_URL')
  if (!process.env.PINECONE_PRICE_VOLUME_INDEX_URL) missing.push('PINECONE_PRICE_VOLUME_INDEX_URL')
  if (!process.env.NEXT_PUBLIC_BASE_URL) missing.push('NEXT_PUBLIC_BASE_URL')
  if (missing.length > 0) {
    console.warn('Missing ENV Vars:', missing)
  }
  console.log('Env check summary:', envSummary)
}


const INDEX_URLS: Record<string, string> = {
  description: process.env.PINECONE_DESCRIPTION_INDEX_URL!,
  financials: process.env.PINECONE_FINANCIALS_INDEX_URL!,
  price_volume: process.env.PINECONE_PRICE_VOLUME_INDEX_URL!,
}



export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; symbol: string } }
) {
  checkEnv();
  const { type, symbol } = params

  const indexUrl = INDEX_URLS[type]
  if (!indexUrl) {
    return NextResponse.json({ error: 'Invalid embedding type' }, { status: 400 })
  }

  try {
    const pineconeFetchRes = await fetch(`${indexUrl}/vectors/fetch`, {
      method: 'POST',
      headers: {
        'Api-Key': process.env.PINECONE_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [symbol] }),
    })

    if (!pineconeFetchRes.ok) {
      const errText = await pineconeFetchRes.text()
      console.error('Pinecone fetch error:', errText)
      return NextResponse.json({ error: 'Failed to fetch embedding from Pinecone', details: errText }, { status: 500 })
    }

    const data = await pineconeFetchRes.json()
    const vector = data.vectors?.[symbol]
    if (!vector || !vector.values) {
      return NextResponse.json({ error: 'Embedding not found for symbol' }, { status: 404 })
    }

    return NextResponse.json({ embedding: vector.values })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch embedding from Pinecone' }, { status: 500 })
  }
}

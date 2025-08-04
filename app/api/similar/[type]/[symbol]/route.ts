// app/api/similar/[type]/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const INDEX_URLS: Record<string, string> = {
  description: process.env.PINECONE_DESCRIPTION_INDEX_URL!,
  financials: process.env.PINECONE_FINANCIALS_INDEX_URL!,
  price_volume: process.env.PINECONE_PRICE_VOLUME_INDEX_URL!,
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; symbol: string } }
) {
  const { type, symbol } = params

  const embeddingRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/embeddings/${type}/${symbol}`
  )
  if (!embeddingRes.ok) {
    return NextResponse.json({ error: 'Embedding fetch failed' }, { status: 500 })
  }

  const { embedding } = await embeddingRes.json()

  const pineconeRes = await fetch(`${INDEX_URLS[type]}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vector: embedding,
      topK: 10,
      includeMetadata: true,
    }),
  })

  if (!pineconeRes.ok) {
    const errText = await pineconeRes.text()
    console.error('Pinecone error:', errText)
    return NextResponse.json({ error: 'Pinecone query failed', details: errText }, { status: 500 })
  }

  const data = await pineconeRes.json()

  if (!data.matches || !Array.isArray(data.matches)) {
    console.error('Invalid Pinecone response:', data)
    return NextResponse.json({ error: 'Invalid Pinecone response', data }, { status: 500 })
  }

  return NextResponse.json(data.matches)
}

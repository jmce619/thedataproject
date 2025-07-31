import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const embeddingRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/embeddings/${params.symbol}`)
  if (!embeddingRes.ok) {
    return NextResponse.json({ error: 'Embedding fetch failed' }, { status: 500 })
  }

  const { embedding } = await embeddingRes.json()

  const pineconeRes = await fetch(`${process.env.PINECONE_INDEX_URL}/query`, {
    method: 'POST',
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    }),
  })

  if (!pineconeRes.ok) {
    return NextResponse.json({ error: 'Pinecone query failed' }, { status: 500 })
  }

  const data = await pineconeRes.json()
  return NextResponse.json(data.matches)
}

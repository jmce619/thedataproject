// app/api/embeddings/[symbol]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  const jsonPath = path.join(process.cwd(), 'data', 'company_descriptions_embedded.json')
  
  try {
    const jsonData = await fs.readFile(jsonPath, 'utf8')
    const descriptions = JSON.parse(jsonData)

    const entry = descriptions.find((item: any) => item.symbol === params.symbol)
    if (!entry) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 })
    }

    return NextResponse.json({ embedding: entry.embedding })

  } catch (err) {
    return NextResponse.json({ error: 'Failed to load embeddings data' }, { status: 500 })
  }
}

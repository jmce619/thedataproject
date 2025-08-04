import { NextRequest, NextResponse } from 'next/server'
import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  region: 'us-east-1', // or your region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = 'data-app-stg'
const PREFIX = 'stock-json/'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase()
  const Key = `${PREFIX}${symbol}.json`
  try {
    const obj = await s3.getObject({ Bucket: BUCKET, Key }).promise()
    const json = JSON.parse(obj.Body!.toString())
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json({ error: 'Signal data not found' }, { status: 404 })
  }
}

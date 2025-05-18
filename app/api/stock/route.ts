// app/api/stock/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) {
    return NextResponse.json({ error: 'No symbol provided' }, { status: 400 })
  }

  const KEY = process.env.ALPHA_VANTAGE_API_KEY
  if (!KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const ovRes = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${KEY}`)
  const overview = await ovRes.json()
  if (!overview.Name) {
    return NextResponse.json({ error: 'API Limit Reached or Invalid Symbol' }, { status: 400 })
  }

  const strippedName = overview.Name.replace(/,?\s+(Inc\.?|Corporation|Corp\.?|LLC|Co\.?|Ltd\.?)$/i, '')
  let logoUrl: string | null = null
  try {
    const cbRes = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(strippedName)}`)
    const suggestions = await cbRes.json()
    if (Array.isArray(suggestions) && suggestions.length > 0 && suggestions[0].domain) {
      logoUrl = `https://logo.clearbit.com/${suggestions[0].domain}`
    }
  } catch {}

  const qtRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${KEY}`)
  const qtJson = await qtRes.json()
  const quote = qtJson['Global Quote'] || {}

  const tsRes = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${KEY}`)
  const tsJson = await tsRes.json()
  const series = tsJson['Time Series (Daily)'] || {}
  const timeSeries = Object.entries(series)
  .map(([date, vals]: [string, any]) => ({
    date,
    open: parseFloat(vals['1. open']),
    high: parseFloat(vals['2. high']),
    low: parseFloat(vals['3. low']),
    close: parseFloat(vals['4. close']),
    volume: parseInt(vals['5. volume'], 10), // Add this line
  }))
  .sort((a, b) => (a.date > b.date ? 1 : -1))


  const finRes = await fetch(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${KEY}`)
  const finJson = await finRes.json()

  if (!finJson.quarterlyReports) {
    return NextResponse.json({ error: 'Quarterly financial data unavailable' }, { status: 400 })
  }

  const quarterlyFinancials = finJson.quarterlyReports.slice(0, 5).map((report: any) => ({
    fiscalDateEnding: report.fiscalDateEnding,
    EBITDA: Number(report.ebitda),
    totalRevenue: Number(report.totalRevenue),
    grossProfit: Number(report.grossProfit),
    netIncome: Number(report.netIncome),
  })).reverse()

  return NextResponse.json({
    overview,
    quote,
    timeSeries,
    logoUrl,
    quarterlyFinancials,
  })
}

// app/stock/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ApexOptions } from 'apexcharts'
import SignalChart from '../components/SignalChart'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type SimilarityType = 'description' | 'financials' | 'price-volume'

export default function StockDashboard() {
  const [symbol, setSymbol] = useState('AAPL')
  const [data, setData] = useState<any>(null)
  const [similarCompanies, setSimilarCompanies] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signalData, setSignalData] = useState<any[]>([])
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)
  const [similarityType, setSimilarityType] = useState<SimilarityType>('description')

  // -------- Fetchers --------
  const fetchData = async (sym: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(sym)}`)
      const jsonData = await res.json()
      if (!res.ok) throw new Error(jsonData.error || 'Fetch failed')
      setData(jsonData)
      await fetchSignalData(sym)
      // Fetch similars for current selector
      await fetchSimilarCompanies(sym, similarityType)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSignalData = async (sym: string) => {
    try {
      const res = await fetch(`/api/signal/${encodeURIComponent(sym)}`)
      const json = await res.json()
      if (res.ok) setSignalData(json)
      else setSignalData([])
    } catch {
      setSignalData([])
    }
  }

  // IMPORTANT: this calls the consolidated feature route
  const fetchSimilarCompanies = async (sym: string, feature: SimilarityType) => {
    try {
      setSimilarCompanies([])
      const res = await fetch(`/api/similar/${encodeURIComponent(feature)}/${encodeURIComponent(sym)}`)
      if (!res.ok) throw new Error('Failed to fetch similar companies')
      const data = await res.json()
      setSimilarCompanies(data) // [{ id, score, description, logoUrl }]
    } catch {
      setSimilarCompanies([])
    }
  }

  const toggleDescription = (sym: string) => {
    setExpandedSymbol(prev => (prev === sym ? null : sym))
  }

  // -------- Effects --------
  useEffect(() => {
    fetchData(symbol)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  useEffect(() => {
    if (symbol) fetchSimilarCompanies(symbol, similarityType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [similarityType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData(symbol)
  }

  return (
    <div className="container dashboard">
      <form onSubmit={handleSubmit} className="dashboard-form" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter ticker (e.g. AAPL)"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Fetching…' : 'Load Dashboard'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="info-financials-wrapper">
            {/* --- Main Info Section --- */}
            <div className="info-section">
              <div className="overview">
                <div className="overview-title">
                  {data.logoUrl && (
                    <img src={data.logoUrl} alt={`${data.overview.Name} logo`} className="company-logo" />
                  )}
                  <h2>{data.overview.Name} ({data.quote['01. symbol']})</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    ${parseFloat(data.quote['05. price']).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: parseFloat(data.quote['09. change']) >= 0 ? '#00B746' : '#EF403C', marginTop: '2px' }}>
                    {parseFloat(data.quote['09. change']) >= 0 ? '▲' : '▼'}&nbsp;
                    {parseFloat(data.quote['09. change']).toFixed(2)}&nbsp;({data.quote['10. change percent']})
                  </span>
                </div>
                <p>{data.overview.Sector} / {data.overview.Industry}</p>
                <p>Market Cap: {Number(data.overview.MarketCapitalization).toLocaleString()} USD</p>
                <p>P/E Ratio: {data.overview.PERatio} | Dividend Yield: {data.overview.DividendYield}</p>
              </div>

              <div className="stats-grid">
                <div className="stat-item">Open: ${data.quote['02. open']}</div>
                <div className="stat-item">Close: ${data.quote['05. price']}</div>
                <div className="stat-item">High: ${data.quote['03. high']}</div>
                <div className="stat-item">Low: ${data.quote['04. low']}</div>
                <div className="stat-item">Volume: {Number(data.quote['06. volume']).toLocaleString()}</div>
              </div>
            </div>

            {/* --- Financials Chart --- */}
            <div className="financials-chart">
              <Chart
                options={{
                  chart: { type: 'bar' },
                  xaxis: {
                    categories: data.quarterlyFinancials.map((f: any) => {
                      const d = new Date(f.fiscalDateEnding)
                      const q = Math.floor(d.getMonth() / 3) + 1
                      return `Q${q} ${d.getFullYear()}`
                    }),
                    labels: { style: { fontSize: '10px' } }
                  },
                  legend: {
                    fontSize: '9px',
                    position: 'top',
                    offsetY: -5,
                    itemMargin: { horizontal: 5, vertical: 0 }
                  },
                  dataLabels: { enabled: false },
                }}
                series={[
                  { name: 'EBITDA', data: data.quarterlyFinancials.map((f: any) => f.EBITDA) },
                  { name: 'Revenue', data: data.quarterlyFinancials.map((f: any) => f.totalRevenue) },
                  { name: 'Gross Profit', data: data.quarterlyFinancials.map((f: any) => f.grossProfit) },
                  { name: 'Net Income', data: data.quarterlyFinancials.map((f: any) => f.netIncome) },
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* --- Candlestick + Volume Chart --- */}
          <div className="chart" style={{ marginTop: '-30px' }}>
            <Chart
              options={{
                chart: { height: 500, type: 'candlestick', toolbar: { show: false } },
                plotOptions: {
                  bar: { columnWidth: '40%' },
                  candlestick: { colors: { upward: '#007BFF', downward: '#FFA500' } },
                },
                stroke: { width: [1, 0] },
                grid: { show: false },
                legend: { show: false },
                xaxis: { type: 'datetime', labels: { style: { fontSize: '10px' } } },
                yaxis: [
                  {
                    seriesName: 'Price',
                    labels: { style: { fontSize: '10px' } },
                    tooltip: { enabled: true },
                  },
                  {
                    seriesName: 'Volume',
                    opposite: true,
                    show: false,
                    labels: { show: false },
                    min: 0,
                    max: Math.max(...data.timeSeries.map((d: any) => d.volume)) * 15,
                  },
                ],
                tooltip: { shared: true, intersect: false },
                colors: ['#007BFF', '#00B746'],
              } as ApexOptions}
              series={[
                {
                  name: 'Price',
                  type: 'candlestick',
                  data: data.timeSeries.map((d: any) => ({
                    x: new Date(d.date),
                    y: [d.open, d.high, d.low, d.close],
                  })),
                },
                {
                  name: 'Volume',
                  type: 'bar',
                  data: data.timeSeries.map((d: any) => ({
                    x: new Date(d.date),
                    y: d.volume,
                  })),
                  color: '#00B746',
                },
              ]}
              type="candlestick"
              height={500}
            />
          </div>

          <div className="description">
            <p>{data.overview.Description}</p>
          </div>
        </>
      )}

      {/* --- Signal and Similar Companies Sidebar --- */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 32,
        marginTop: 32,
        width: '100%',
        paddingLeft: 0,
      }}>
        <div style={{ flex: 1 }}>
          <SignalChart data={signalData} signalKey="zscore_signal" title="Z-Score Signals" />
          <SignalChart data={signalData} signalKey="sma_signal" title="SMA Signals" />
          <SignalChart data={signalData} signalKey="stoch_signal" title="Stochastic Signals" />
        </div>

        <div style={{ minWidth: 300, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>
              Top 10 Companies by{' '}
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={similarityType}
                  onChange={(e) => setSimilarityType(e.target.value as SimilarityType)}
                  title="Choose the similarity space to query"
                  style={{
                    font: 'inherit',
                    fontWeight: 'inherit',
                    lineHeight: 'inherit',
                    color: 'inherit',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    paddingRight: 16, // room for the ▼
                  }}
                >
                  <option value="description">Description</option>
                  <option value="financials">Financials</option>
                  <option value="price-volume">Price-Volume</option>
                </select>

                {/* custom caret */}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                  focusable="false"
                  style={{
                    position: 'absolute',
                    right: 2,
                    top: '50%',
                    transform: 'translateY(-40%)',
                    pointerEvents: 'none',
                    opacity: 0.7,
                  }}
                >
                  <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
            </h3>
          </div>

          {similarCompanies.map((comp: any) => (
            <div key={comp.id} style={{ marginBottom: 16, border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
              <div
                style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => toggleDescription(comp.id)}
                title="Click to expand/collapse"
              >
                {/* Logo slot */}
                <div style={{ width: 22, height: 22, borderRadius: 4, overflow: 'hidden', flex: '0 0 22px' }}>
                  {comp.logoUrl ? (
                    <img
                      src={comp.logoUrl}
                      alt={`${comp.id} logo`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <span>{comp.id}</span>
                <span style={{ fontSize: 14, color: '#999', marginLeft: 'auto' }}>→</span>
              </div>

              {expandedSymbol === comp.id && (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {comp.description || 'No description found.'}
                </div>
              )}

              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                Similarity: {typeof comp.score === 'number' ? comp.score.toFixed(3) : comp.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

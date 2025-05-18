// app/stock/page.tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ApexOptions } from 'apexcharts'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function StockDashboard() {
  const [symbol, setSymbol] = useState('AAPL')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = async (sym: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(sym)}`)
      const jsonData = await res.json()
      if (!res.ok) throw new Error(jsonData.error || 'Fetch failed')
      setData(jsonData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(symbol) }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData(symbol)
  }

  return (
    <div className="container dashboard">
      <form onSubmit={handleSubmit} className="dashboard-form">
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
            <div className="info-section">
            <div className="overview">
            <div className="overview-title">
              {data.logoUrl && (
                <img src={data.logoUrl} alt={`${data.overview.Name} logo`} className="company-logo" />
              )}
              <h2>{data.overview.Name} ({data.quote['01. symbol']})</h2>
            </div>

            {/* New price and change section */}
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

            <div className="financials-chart">
            <Chart
              options={{
                chart: { type: 'bar' },
                xaxis: {
                  categories: data.quarterlyFinancials.map((f: any) => {
                    const d = new Date(f.fiscalDateEnding);
                    const q = Math.floor(d.getMonth() / 3) + 1;
                    return `Q${q} ${d.getFullYear()}`;
                  }),
                  labels: { style: { fontSize: '10px' } }
                },
                legend: { 
                  fontSize: '9px',     // 👈 Smaller legend
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

          {/* Final Customized Candlestick + Volume Chart */}
          {/* Customized Candlestick + Volume Chart with User Colors */}
          <div className="chart" style={{ marginTop: '-30px' }}>
          <Chart
            options={{
              chart: {
                height: 500,
                type: 'candlestick',
                toolbar: { show: false },
              },
              plotOptions: {
                bar: {
                  columnWidth: '40%',
                },
                candlestick: {
                  colors: {
                    upward: '#007BFF',
                    downward: '#FFA500',
                  },
                },
              },
              stroke: {
                width: [1, 0],
              },
              grid: {
                show: false,
              },
              legend: {
                show: false, // 👈 hides the legend
              },
              xaxis: {
                type: 'datetime',
                labels: {
                  style: { fontSize: '10px' },
                },
              },
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
              tooltip: {
                shared: true,
                intersect: false,
              },
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
    </div>
  )
}

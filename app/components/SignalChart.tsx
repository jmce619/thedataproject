'use client'
import React from 'react'
import dynamic from 'next/dynamic'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function SignalChart({
  data,
  signalKey,
  title,
}: {
  data: any[]
  signalKey: 'zscore_signal' | 'sma_signal' | 'stoch_signal'
  title: string
}) {
  if (!data || data.length === 0) return null

  const priceSeries = data.map(d => [new Date(d.date).getTime(), d.close])
  const buyMarkers = data
    .filter(d => d[signalKey] === 1)
    .map(d => ({
      x: new Date(d.date).getTime(),
      y: d.close,
      marker: {
        size: 2,
        fillColor: 'green',
        strokeColor: 'green',
        shape: 'triangle',
      }
    }))
  const sellMarkers = data
    .filter(d => d[signalKey] === -1)
    .map(d => ({
      x: new Date(d.date).getTime(),
      y: d.close,
      marker: {
        size: 2,
        fillColor: 'red',
        strokeColor: 'red',
        shape: 'triangleDown',
      }
    }))

  const options = {
    chart: { type: 'line', height: 160, toolbar: { show: false } },
    xaxis: { type: 'datetime', labels: { style: { fontSize: '10px' } } },
    yaxis: { labels: { style: { fontSize: '10px' } } },
    markers: { size: 0 },
    stroke: { width: 1.5 },
    annotations: {
      points: [...buyMarkers, ...sellMarkers]
    },
    tooltip: { x: { format: 'yyyy-MM-dd' } }
  }

  const series = [{ name: 'Close', data: priceSeries }]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    }}>
      <span
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: 15,
          color: '#888',
          marginRight: 10,
          letterSpacing: 1,
          fontWeight: 500,
          userSelect: 'none',
          lineHeight: 1,
          minWidth: 28
        }}
      >
        {title}
      </span>
      <ReactApexChart options={options} series={series} type="line" height={200} width={500} />
    </div>
  )
}

'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import dynamic from 'next/dynamic'
import type { FeatureCollection, Feature } from 'geojson'
import 'leaflet/dist/leaflet.css'

// dynamic imports typed as any
const MapContainer: React.ComponentType<any> = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const GeoJSON: React.ComponentType<any> = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
)

export default function DistrictResultsPage() {
  const [houseData, setHouseData] = useState<FeatureCollection | null>(null)
  const [senateData, setSenateData] = useState<FeatureCollection | null>(null)
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house')
  const [error, setError] = useState<string | null>(null)

  // Fetch & merge House data
  useEffect(() => {
    async function fetchHouse() {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch('/data/congress.geojson'),
          fetch('/data/election_results.json'),
        ])
        if (!dRes.ok || !rRes.ok) throw new Error('House data load failed')
        const districts = (await dRes.json()) as FeatureCollection
        const results = (await rRes.json()) as any[]

        const winners: Record<string, any> = {}
        results.forEach((rec) => {
          if (!winners[rec.GeoID] || winners[rec.GeoID]['%'] < rec['%']) {
            winners[rec.GeoID] = rec
          }
        })

        const features = districts.features.map((feat) => {
          const props = feat.properties as any
          const gid = props.GEOID || props.geoid || props.GEOID20
          const win = winners[gid] || {}
          return {
            ...feat,
            properties: {
              ...props,
              winnerParty: win.Party,
              winnerPct: win['%'] ?? 0,
            },
          }
        })

        setHouseData({ ...districts, features })
      } catch (err: any) {
        setError(err.message)
      }
    }
    fetchHouse()
  }, [])

  // Fetch Senate data
  useEffect(() => {
    async function fetchSenate() {
      try {
        const res = await fetch('/data/us_states_senate_merged.geojson')
        if (!res.ok) throw new Error('Senate data load failed')
        setSenateData((await res.json()) as FeatureCollection)
      } catch (err: any) {
        setError(err.message)
      }
    }
    fetchSenate()
  }, [])

  // Styling functions
  const styleHouse = (feature: Feature) => {
    const { winnerParty: p, winnerPct: pct } = feature.properties as any
    return {
      fillColor: p === 'R' ? '#EF4444' : p === 'D' ? '#3B82F6' : '#ccc',
      fillOpacity: pct / 100,
      color: '#222',
      weight: 0.5,
    }
  }
  const styleSenate = (feature: Feature) => {
    const { party_simplified: p, vote_pct: pct } = feature.properties as any
    return {
      fillColor: p === 'REPUBLICAN' ? '#EF4444' : p === 'DEMOCRAT' ? '#3B82F6' : '#ccc',
      fillOpacity: pct / 100,
      color: '#222',
      weight: 0.5,
    }
  }

  const currentData = selectedMap === 'house' ? houseData : senateData
  const currentStyle = selectedMap === 'house' ? styleHouse : styleSenate
  const loadingText = selectedMap === 'house' ? 'Loading House map…' : 'Loading Senate map…'

  return (
    <div className="flex flex-col items-start space-y-4 w-full px-4 py-6">
      <select
        value={selectedMap}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setSelectedMap(e.target.value as 'house' | 'senate')
        }
        className="p-2 border rounded shadow-sm"
      >
        <option value="house">US House Results</option>
        <option value="senate">US Senate Results</option>
      </select>

      {error && <div className="text-red-500">{error}</div>}

      {!error && currentData ? (
        <MapContainer
          key={selectedMap}
          center={[37.8, -96]}
          zoom={4}
          className="leaflet-container"
          attributionControl={false}
        >
          <GeoJSON data={currentData} style={currentStyle} />
        </MapContainer>
      ) : !error ? (
        <p className="text-gray-500">{loadingText}</p>
      ) : null}
    </div>
  )
}

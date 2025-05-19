// app/page3/page.tsx
'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import dynamic from 'next/dynamic'
import type { FeatureCollection, Feature } from 'geojson'
import 'leaflet/dist/leaflet.css'

// ↓ dynamic imports disable SSR for these browser-only modules
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
)
const GeoJSON = dynamic(
  () => import('react-leaflet').then((m) => m.GeoJSON),
  { ssr: false }
)

export default function DistrictResultsPage() {
  const [houseData, setHouseData] = useState<FeatureCollection | null>(null)
  const [senateData, setSenateData] = useState<FeatureCollection | null>(null)
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house')
  const [error, setError] = useState<string | null>(null)

  // ——— Data fetching ———
  useEffect(() => {
    async function fetchHouse() {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch('/data/congress.geojson'),
          fetch('/data/election_results.json'),
        ])
        if (!dRes.ok || !rRes.ok) throw new Error('Failed to load House data')

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
      } catch (e: any) {
        setError(e.message)
      }
    }
    fetchHouse()
  }, [])

  useEffect(() => {
    async function fetchSenate() {
      try {
        const res = await fetch('/data/us_states_senate_merged.geojson')
        if (!res.ok) throw new Error('Failed to load Senate data')
        setSenateData((await res.json()) as FeatureCollection)
      } catch (e: any) {
        setError(e.message)
      }
    }
    fetchSenate()
  }, [])

  // ——— Styling callbacks ———
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
    const props = feature.properties as any
    const p = props.party_simplified
    const pct = props.vote_pct
    return {
      fillColor: p === 'REPUBLICAN' ? '#EF4444' : p === 'DEMOCRAT' ? '#3B82F6' : '#ccc',
      fillOpacity: pct / 100,
      color: '#222',
      weight: 0.5,
    }
  }

  // ——— Pick the right data + style ———
  const currentData = selectedMap === 'house' ? houseData : senateData
  const currentStyle = selectedMap === 'house' ? styleHouse : styleSenate
  const loadingText =
    selectedMap === 'house' ? 'Loading House map…' : 'Loading Senate map…'

  // ——— All your Leaflet MapOptions in one place ———
  const mapOptions: MapOptions = {
    center: [37.8, -96],
    zoom: 4,
    attributionControl: false, // hide the default Leaflet credit
    zoomControl: true,
  }

  return (
    <div className="page3 flex flex-col items-start space-y-4 w-full px-4 py-6">
      <select
        value={selectedMap}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setSelectedMap(e.target.value as 'house' | 'senate')
        }
        className="p-2 border rounded"
      >
        <option value="house">US House Results</option>
        <option value="senate">US Senate Results</option>
      </select>

      {error && <div className="text-red-500">{error}</div>}


      {currentData ? (
        <MapContainer
          {...(mapOptions as any)}
          style={{ height: '600px', width: '100%' }}
          className="leaflet-container"
        >
          <GeoJSON
            data={currentData}
            pathOptions={currentStyle}    // ← use pathOptions instead of style
          />
        </MapContainer>
      ) : (
        <p className="text-gray-500">{loadingText}</p>
      )}

    </div>
  )
}

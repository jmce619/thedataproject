'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import dynamic from 'next/dynamic'
import type { FeatureCollection, Feature } from 'geojson'

// Leaflet client-only
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
)

export default function DistrictResultsPage() {
  // Data stores
  const [houseData, setHouseData] = useState<FeatureCollection | null>(null)
  const [senateData, setSenateData] = useState<FeatureCollection | null>(null)
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house')

  // Load and merge House…
  useEffect(() => {
    Promise.all([
      fetch('/data/congress.geojson').then((r) => r.json()),
      fetch('/data/election_results.json').then((r) => r.json()),
    ]).then(([districts, results]: [FeatureCollection, any[]]) => {
      const winners: Record<string, any> = {}
      results.forEach((rec) => {
        if (!winners[rec.GeoID] || winners[rec.GeoID]['%'] < rec['%']) {
          winners[rec.GeoID] = rec
        }
      })

      const features = districts.features.map((feat: Feature) => {
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
    })
  }, [])

  // Load pre-merged Senate…
  useEffect(() => {
    fetch('/data/us_states_senate_merged.geojson')
      .then((r) => r.json())
      .then((geojson: FeatureCollection) => setSenateData(geojson))
  }, [])

  // Style callbacks
  const styleHouse = (feature: Feature) => {
    const { winnerParty: p, winnerPct: pct } = feature.properties as any
    let fillColor = '#ccc'
    if (p === 'R') fillColor = '#EF4444'
    else if (p === 'D') fillColor = '#3B82F6'
    return { fillColor, fillOpacity: pct / 100, color: '#222', weight: 0.5 }
  }

  const styleSenate = (feature: Feature) => {
    const props = feature.properties as any
    const p = props.party_simplified
    const pct = props.vote_pct
    let fillColor = '#ccc'
    if (p === 'REPUBLICAN') fillColor = '#EF4444'
    else if (p === 'DEMOCRAT') fillColor = '#3B82F6'
    return { fillColor, fillOpacity: pct / 100, color: '#222', weight: 0.5 }
  }

  // Pick the right data & style
  const currentData = selectedMap === 'house' ? houseData : senateData
  const currentStyle = selectedMap === 'house' ? styleHouse : styleSenate
  const loadingText =
    selectedMap === 'house' ? 'Loading House map…' : 'Loading Senate map…'

  return (
    <div className="page3 flex flex-col items-start space-y-4 w-full">
      {/* Dropdown */}
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

      {/* Map */}
      {currentData ? (
      {/* above your MapContainer, tell TS to shut up: */}
      {/* @ts-ignore */}
      <MapContainer
        center={[37.8, -96]}
        zoom={4}
        attributionControl={false}
        className="leaflet-container"
        key={selectedMap}
      >
        <GeoJSON data={currentData} style={currentStyle} />
      </MapContainer>

      ) : (
        <p>{loadingText}</p>
      )}
    </div>
  )
}

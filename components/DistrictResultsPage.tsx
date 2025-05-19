'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import type { FeatureCollection, Feature } from 'geojson'
import 'leaflet/dist/leaflet.css'
//
// Helper to set view since we omit `center` prop
function SetView({ coords, zoom }: { coords: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => void map.setView(coords, zoom), [map, coords, zoom])
  return null
}

export default function DistrictResultsPage() {
  const [houseData, setHouseData] = useState<FeatureCollection | null>(null)
  const [senateData, setSenateData] = useState<FeatureCollection | null>(null)
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHouse() {
      try {
        const [dR, rR] = await Promise.all([
          fetch('/data/congress.geojson'),
          fetch('/data/election_results.json'),
        ])
        if (!dR.ok || !rR.ok) throw new Error('House fetch failed')
        const districts = (await dR.json()) as FeatureCollection
        const results = (await rR.json()) as any[]

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
    loadHouse()
  }, [])

  useEffect(() => {
    async function loadSenate() {
      try {
        const r = await fetch('/data/us_states_senate_merged.geojson')
        if (!r.ok) throw new Error('Senate fetch failed')
        setSenateData((await r.json()) as FeatureCollection)
      } catch (e: any) {
        setError(e.message)
      }
    }
    loadSenate()
  }, [])

  const styleHouse = (f: Feature) => {
    const { winnerParty: p, winnerPct: pct } = f.properties as any
    return {
      fillColor: p === 'R' ? '#EF4444' : p === 'D' ? '#3B82F6' : '#ccc',
      fillOpacity: pct / 100,
      color: '#222',
      weight: 0.5,
    }
  }
  const styleSenate = (f: Feature) => {
    const props = f.properties as any
    const p = props.party_simplified
    const pct = props.vote_pct
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
  const centerCoords: [number, number] = [37.8, -96]
  const zoomLevel = 4

  return (
    <div className="flex flex-col space-y-4 w-full px-4 py-6">
      <select
        className="p-2 border rounded"
        value={selectedMap}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          setSelectedMap(e.target.value as 'house' | 'senate')
        }
      >
        <option value="house">US House Results</option>
        <option value="senate">US Senate Results</option>
      </select>

      {error && <div className="text-red-500">{error}</div>}

      {currentData ? (
        <MapContainer
          key={selectedMap}
          className="leaflet-container"
        >
          <SetView coords={centerCoords} zoom={zoomLevel} />
          <GeoJSON data={currentData}/>
        </MapContainer>
      ) : (
        <p className="text-gray-500">{loadingText}</p>
      )}
    </div>
  )
}

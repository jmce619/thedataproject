// app/page3/page.tsx
'use client';

import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection, Feature } from 'geojson';
import type { MapOptions, Path } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DistrictMiniMap from '../../components/DistrictMiniMap';

// React-Leaflet (client only)
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then(m => m.GeoJSON),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);

export default function DistrictResultsPage() {
  const [houseData, setHouseData] = useState<FeatureCollection | null>(null);
  const [senateData, setSenateData] = useState<FeatureCollection | null>(null);
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house');
  const [error, setError] = useState<string | null>(null);
  const [selectedGeoId, setSelectedGeoId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHouse() {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch('/data/congress.geojson'),
          fetch('/data/election_results.json'),
        ]);
        if (!dRes.ok || !rRes.ok) throw new Error('Failed to load House data');

        const districts = (await dRes.json()) as FeatureCollection;
        const results = (await rRes.json()) as any[];

        const winners: Record<string, any> = {};
        results.forEach((rec) => {
          if (!winners[rec.GeoID] || winners[rec.GeoID]['%'] < rec['%']) {
            winners[rec.GeoID] = rec;
          }
        });

        const features = districts.features.map((feat) => {
          const props = feat.properties as any;
          const gid = props.GEOID || props.geoid || props.GEOID20;
          const win = winners[gid] || {};
          return {
            ...feat,
            properties: {
              ...props,
              winnerParty: win.Party,
              winnerPct: win['%'] ?? 0,
            },
          };
        });

        setHouseData({ ...districts, features });
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchHouse();
  }, []);

  useEffect(() => {
    async function fetchSenate() {
      try {
        const res = await fetch('/data/us_states_senate_merged.geojson');
        if (!res.ok) throw new Error('Failed to load Senate data');
        setSenateData((await res.json()) as FeatureCollection);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchSenate();
  }, []);

  const styleHouse = (feature: Feature) => ({
    fillColor:
      (feature.properties as any).winnerParty === 'R' ? '#EF4444' :
      (feature.properties as any).winnerParty === 'D' ? '#3B82F6' :
      '#9CA3AF',
    fillOpacity: Math.min(0.8, 0.35 + (((feature.properties as any).winnerPct ?? 0) / 100) * 0.45),
    color: '#222',
    weight: 0.5,
  });

  const styleSenate = (feature: Feature) => ({
    fillColor:
      (feature.properties as any).party_simplified === 'REPUBLICAN' ? '#EF4444' :
      (feature.properties as any).party_simplified === 'DEMOCRAT' ? '#3B82F6' :
      '#9CA3AF',
    fillOpacity: Math.min(0.8, 0.35 + (((feature.properties as any).vote_pct ?? 0) / 100) * 0.45),
    color: '#222',
    weight: 0.5,
  });

  const currentData = selectedMap === 'house' ? houseData : senateData;
  const loadingText = selectedMap === 'house' ? 'Loading House map…' : 'Loading Senate map…';

  const mapOptions: MapOptions = useMemo(() => ({
    center: [37.8, -96],
    zoom: 4,
    attributionControl: false,
    zoomControl: true,
  }), []);

  return (
    <div className="page3 w-full px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <select
          value={selectedMap}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedMap(e.target.value as 'house' | 'senate')}
          className="p-2 border rounded"
        >
          <option value="house">US House Results</option>
          <option value="senate">US Senate Results</option>
        </select>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      {/* Always side-by-side using CSS grid classes defined in app/global.css */}
      <div className="two-up">
        {/* LEFT: Main results map */}
        <div className="map-cell">
          {currentData ? (
            <MapContainer
              {...(mapOptions as any)}
              className="leaflet-container rounded-xl overflow-hidden shadow"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
              <GeoJSON
                key={selectedMap}
                data={currentData}
                style={selectedMap === 'house' ? styleHouse : styleSenate}
                onEachFeature={(feature, layer) => {
                  const pathLayer = layer as Path;
                  layer.on({
                    mouseover: () => (pathLayer as any).setStyle?.({ weight: 1.5, color: '#111' }),
                    mouseout: () => (pathLayer as any).setStyle?.({ weight: 0.5, color: '#222' }),
                    click: () => {
                      const gid = (feature.properties as any)?.GEOID
                        ?? (feature.properties as any)?.geoid
                        ?? (feature.properties as any)?.GEOID20
                        ?? null;
                      if (gid) setSelectedGeoId(String(gid));
                    }
                  });
                  const name = (feature.properties as any)?.NAMELSAD
                    ?? (feature.properties as any)?.NAME
                    ?? (feature.properties as any)?.state
                    ?? 'Area';
                  (layer as any).bindTooltip(`${name}`, { sticky: true });
                }}
              />
            </MapContainer>
          ) : (
            <p className="text-gray-500">{loadingText}</p>
          )}
        </div>

        {/* RIGHT: Mini districts map with inline-chart tooltip */}
        <div className="map-cell">
          <DistrictMiniMap
            dataUrl="/data/demography.geojson"
            selectedGeoId={selectedGeoId}
            onSelectGeoId={setSelectedGeoId}
          />
        </div>
      </div>
    </div>
  );
}

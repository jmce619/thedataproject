'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type { Path, PathOptions, StyleFunction } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DistrictMiniMap from '../../components/DistrictMiniMap';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(m => m.GeoJSON), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });

type FC = FeatureCollection<Geometry, GeoJsonProperties>;

export default function DistrictResultsPage() {
  const [houseData, setHouseData] = useState<FC | null>(null);
  const [senateData, setSenateData] = useState<FC | null>(null);
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house');
  const [error, setError] = useState<string | null>(null);
  const [selectedGeoId, setSelectedGeoId] = useState<string | null>(null);
  const [hoveredFeatureProps, setHoveredFeatureProps] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    async function fetchHouse() {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch('/data/congress.geojson'),
          fetch('/data/election_results.json'),
        ]);
        if (!dRes.ok || !rRes.ok) throw new Error('Failed to load House data');

        const districts = (await dRes.json()) as FC;
        const results = (await rRes.json()) as any[];

        const winners: Record<string, any> = {};
        results.forEach((rec) => {
          if (!winners[rec.GeoID] || winners[rec.GeoID]['%'] < rec['%']) {
            winners[rec.GeoID] = rec;
          }
        });

        const features = districts.features.map((feat) => {
          const props = (feat.properties ?? {}) as Record<string, any>;
          const gid = props.GEOID ?? props.geoid ?? props.GEOID20;
          const win = winners[gid as string] || {};
          return {
            ...feat,
            properties: {
              ...props,
              winnerParty: win.Party,
              winnerPct: win['%'] ?? 0,
            } as GeoJsonProperties,
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
        setSenateData((await res.json()) as FC);
      } catch (e: any) {
        setError(e.message);
      }
    }
    fetchSenate();
  }, []);

  const styleHouse: StyleFunction<GeoJsonProperties> = (feature): PathOptions => {
    if (!feature) return {};
    const props = (feature.properties ?? {}) as any;

    const fillColor =
      props.winnerParty === 'R' ? '#EF4444' :
      props.winnerParty === 'D' ? '#3B82F6' :
      '#9CA3AF';

    const fillOpacity = Math.min(0.8, 0.35 + (((props.winnerPct ?? 0) as number) / 100) * 0.45);

    return { fillColor, fillOpacity, color: '#222', weight: 0.5 };
  };

  const styleSenate: StyleFunction<GeoJsonProperties> = (feature): PathOptions => {
    if (!feature) return {};
    const props = (feature.properties ?? {}) as any;

    const fillColor =
      props.party_simplified === 'REPUBLICAN' ? '#EF4444' :
      props.party_simplified === 'DEMOCRAT' ? '#3B82F6' :
      '#9CA3AF';

    const fillOpacity = Math.min(0.8, 0.35 + (((props.vote_pct ?? 0) as number) / 100) * 0.45);

    return { fillColor, fillOpacity, color: '#222', weight: 0.5 };
  };

  const currentData = selectedMap === 'house' ? houseData : senateData;
  const loadingText = selectedMap === 'house' ? 'Loading House map…' : 'Loading Senate map…';

  const mapOptions = useMemo(() => ({
    center: [37.8, -96] as [number, number],
    zoom: 4,
    attributionControl: false,
    zoomControl: true,
  }), []);

  return (
    <div className="page3 w-full px-4 py-6 relative">
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

      <div className="map-row grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {currentData ? (
            <MapContainer key={selectedMap} {...(mapOptions as any)} className="leaflet-container rounded-xl overflow-hidden shadow">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
              <GeoJSON
                key={selectedMap}
                data={currentData as FC}
                style={selectedMap === 'house' ? styleHouse : styleSenate}
                onEachFeature={(feature, layer) => {
                  if (!feature) return;
                  const pathLayer = layer as Path;
                  const props = (feature.properties ?? {}) as any;

                  layer.on({
                    mouseover: () => {
                      (pathLayer as any).setStyle?.({ weight: 1.5, color: '#111' });
                      setHoveredFeatureProps(props);
                    },
                    mouseout: () => {
                      (pathLayer as any).setStyle?.({ weight: 0.5, color: '#222' });
                      setHoveredFeatureProps(null);
                    },
                    click: () => {
                      const gid = props.GEOID ?? props.geoid ?? props.GEOID20 ?? null;
                      if (gid) setSelectedGeoId(String(gid));
                    }
                  });

                  const name = props.NAMELSAD ?? props.NAME ?? props.state ?? 'Area';
                  (layer as any).bindTooltip(`${name}`, { sticky: true });
                }}
              />
            </MapContainer>
          ) : (
            <p className="text-gray-500">{loadingText}</p>
          )}
        </div>

        <div>
          <DistrictMiniMap
            dataUrl="/data/demography.geojson"
            selectedGeoId={selectedGeoId}
            onSelectGeoId={setSelectedGeoId}
          />
          {/* Or, to show charts instead of the mini map:
              <DemographyPanel dataUrl="/data/demography.geojson" selectedGeoId={selectedGeoId} />
          */}
        </div>
      </div>

      {hoveredFeatureProps && (
        <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-3 text-sm border border-gray-200 z-20 max-w-sm">
          <div className="font-semibold mb-1">
            {hoveredFeatureProps.NAMELSAD || hoveredFeatureProps.NAME || hoveredFeatureProps.state || 'District'}
          </div>
          {selectedMap === 'house' ? (
            <>
              <div><b>Party:</b> {hoveredFeatureProps.winnerParty || '—'}</div>
              <div><b>Win %:</b> {hoveredFeatureProps.winnerPct?.toFixed(1) || '—'}%</div>
            </>
          ) : (
            <>
              <div><b>Party:</b> {hoveredFeatureProps.party_simplified || '—'}</div>
              <div><b>Vote %:</b> {hoveredFeatureProps.vote_pct?.toFixed(1) || '—'}%</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

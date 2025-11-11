'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from 'geojson';
import type { Path, PathOptions, StyleFunction } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// NOTE: DistrictMiniMap must be the updated version that supports `onSelectDetails`
import DistrictMiniMap, { MiniMapDetails } from '../../components/DistrictMiniMap';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(m => m.GeoJSON), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });

// ----------------------------- Types -----------------------------
type FC = FeatureCollection<Geometry, GeoJsonProperties>;

type ElectionRow = {
  GeoID: string | number;
  Party?: 'R' | 'D' | string;
  '%': number | string;
};

function asPct(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? `${v.toFixed(1)}%` : '—';
}

// ----------------------------- Main Page -----------------------------
export default function DistrictResultsPage() {
  const [houseData, setHouseData] = useState<FC | null>(null);
  const [senateData, setSenateData] = useState<FC | null>(null);
  const [selectedMap, setSelectedMap] = useState<'house' | 'senate'>('house');
  const [error, setError] = useState<string | null>(null);

  const [selectedGeoId, setSelectedGeoId] = useState<string | null>(null);
  const [hoveredFeatureProps, setHoveredFeatureProps] = useState<Record<string, any> | null>(null);
  const [selectedFeatureProps, setSelectedFeatureProps] = useState<Record<string, any> | null>(null);

  // NEW: holds the exact HTML block (charts) from the mini-map click
  const [miniDetails, setMiniDetails] = useState<MiniMapDetails | null>(null);

  // ------- Load House (districts + winners) -------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch('/data/congress.geojson'),
          fetch('/data/election_results.json'),
        ]);
        if (!dRes.ok || !rRes.ok) throw new Error('Failed to load House data');

        const districts = (await dRes.json()) as FC;
        const rawResults = (await rRes.json()) as unknown;

        const results: ElectionRow[] = Array.isArray(rawResults) ? (rawResults as ElectionRow[]) : [];
        const winners: Record<string, ElectionRow> = {};

        for (const rec of results) {
          const gid = String((rec?.GeoID ?? '')).trim();
          if (!gid) continue;
          const pct = Number(rec['%']) || 0;
          const existing = winners[gid];
          if (!existing || (Number(existing['%']) || 0) < pct) {
            winners[gid] = { ...rec, '%': pct };
          }
        }

        const features = (districts.features || []).map(
          (feat: Feature<Geometry, GeoJsonProperties>) => {
            const props = (feat.properties ?? {}) as Record<string, any>;
            const gidRaw = props.GEOID ?? props.geoid ?? props.GEOID20;
            const gid = gidRaw != null ? String(gidRaw).trim() : '';
            const win = gid && winners[gid] ? winners[gid] : undefined;

            return {
              ...feat,
              properties: {
                ...props,
                __GEOID__: gid || null,
                winnerParty: win?.Party ?? null,
                winnerPct: (win ? Number(win['%']) : 0) || 0,
              } as GeoJsonProperties,
            };
          }
        );

        if (!cancelled) setHouseData({ ...districts, features });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load House map');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ------- Load Senate (states with results merged) -------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data/us_states_senate_merged.geojson');
        if (!res.ok) throw new Error('Failed to load Senate data');
        const data = (await res.json()) as FC;
        if (!cancelled) setSenateData(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load Senate map');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ------- Styles (memoized) -------
  const styleHouse: StyleFunction<GeoJsonProperties> = useMemo(() => {
    return (feature): PathOptions => {
      const props = (feature?.properties ?? {}) as any;
      const pct = Number(props.winnerPct) || 0;

      const fillColor =
        props.winnerParty === 'R' ? '#EF4444' :
        props.winnerParty === 'D' ? '#3B82F6' :
        '#9CA3AF';

      const fillOpacity = Math.min(0.8, 0.35 + (pct / 100) * 0.45);
      return { fillColor, fillOpacity, color: '#222', weight: 0.5 };
    };
  }, []);

  const styleSenate: StyleFunction<GeoJsonProperties> = useMemo(() => {
    return (feature): PathOptions => {
      const props = (feature?.properties ?? {}) as any;
      const pct = Number(props.vote_pct) || 0;

      const fillColor =
        props.party_simplified === 'REPUBLICAN' ? '#EF4444' :
        props.party_simplified === 'DEMOCRAT' ? '#3B82F6' :
        '#9CA3AF';

      const fillOpacity = Math.min(0.8, 0.35 + (pct / 100) * 0.45);
      return { fillColor, fillOpacity, color: '#222', weight: 0.5 };
    };
  }, []);

  const currentData = selectedMap === 'house' ? houseData : senateData;
  const loadingText = selectedMap === 'house' ? 'Loading House map…' : 'Loading Senate map…';

  const mapOptions = useMemo(
    () => ({
      center: [37.8, -96] as [number, number],
      zoom: 4,
      attributionControl: false,
      zoomControl: true,
    }),
    []
  );

  // reset selection when switching maps (keeps both panels in sync)
  useEffect(() => {
    setSelectedFeatureProps(null);
    setSelectedGeoId(null);
    setMiniDetails(null); // clear the right-side chart panel on map switch
  }, [selectedMap]);

  return (
    <div className="page3 w-full px-4 py-6 relative">
      <div className="flex items-center gap-3 mb-4">
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
        {error && (
          <div className="text-red-600 text-sm border border-red-400 rounded px-2 py-1 bg-red-50">
            {error}
          </div>
        )}
      </div>

      <div className="map-row grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Big Map + Details panel */}
        <div className="flex flex-col gap-4">
          {currentData ? (
            <div className="rounded-xl overflow-hidden shadow relative">
              <MapContainer
                key={selectedMap}
                {...(mapOptions as any)}
                className="leaflet-container"
                style={{ height: 620, width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution=""
                />
                <GeoJSON
                  key={selectedMap}
                  data={currentData as FC}
                  style={selectedMap === 'house' ? styleHouse : styleSenate}
                  onEachFeature={(feature, layer) => {
                    if (!feature) return;
                    const pathLayer = layer as unknown as Path;
                    const props = (feature.properties ?? {}) as Record<string, any>;

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
                        // Select for details + (optional) sync to right mini map GeoID
                        const gidRaw =
                          props.__GEOID__ ??
                          props.GEOID ??
                          props.geoid ??
                          props.GEOID20 ??
                          props.STATEFP ??
                          props.STUSPS ??
                          props.NAME ??
                          null;
                        const gid = gidRaw != null ? String(gidRaw).trim() : null;
                        if (gid) setSelectedGeoId(gid);
                        setSelectedFeatureProps(props);
                      },
                    });

                    const name = props.NAMELSAD ?? props.NAME ?? props.state ?? 'Area';
                    (layer as any).bindTooltip(`${name}`, { sticky: true, opacity: 0.9 });
                  }}
                />
              </MapContainer>

              {/* Hover chip (non-blocking) */}
              {hoveredFeatureProps && (
                <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg shadow p-2 text-xs border border-gray-200">
                  <div className="font-semibold">
                    {hoveredFeatureProps.NAMELSAD ||
                      hoveredFeatureProps.NAME ||
                      hoveredFeatureProps.state ||
                      'District'}
                  </div>
                  {selectedMap === 'house' ? (
                    <div className="flex gap-2">
                      <span>Party: {hoveredFeatureProps.winnerParty || '—'}</span>
                      <span>Win: {asPct(hoveredFeatureProps.winnerPct)}</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <span>Party: {hoveredFeatureProps.party_simplified || '—'}</span>
                      <span>Vote: {asPct(hoveredFeatureProps.vote_pct)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">{loadingText}</p>
          )}

          {/* Details panel (beneath left map) */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">
                {selectedFeatureProps
                  ? selectedFeatureProps.NAMELSAD ||
                    selectedFeatureProps.NAME ||
                    selectedFeatureProps.state ||
                    'Selected Area'
                  : 'Click a district/state to view details'}
              </div>
              {selectedFeatureProps && (
                <button
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                  onClick={() => {
                    setSelectedFeatureProps(null);
                    setSelectedGeoId(null);
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {selectedFeatureProps ? (
              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {/* Common */}
                <div>
                  <div className="text-gray-500">GeoID</div>
                  <div className="font-medium">
                    {selectedFeatureProps.__GEOID__ ??
                      selectedFeatureProps.GEOID ??
                      selectedFeatureProps.geoid ??
                      selectedFeatureProps.GEOID20 ??
                      selectedFeatureProps.STATEFP ??
                      selectedFeatureProps.STUSPS ??
                      selectedFeatureProps.NAME ??
                      '—'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Name</div>
                  <div className="font-medium">
                    {selectedFeatureProps.NAMELSAD ||
                      selectedFeatureProps.NAME ||
                      selectedFeatureProps.state ||
                      '—'}
                  </div>
                </div>

                {selectedMap === 'house' ? (
                  <>
                    <div>
                      <div className="text-gray-500">Winner Party</div>
                      <div className="font-medium">
                        {selectedFeatureProps.winnerParty || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Win %</div>
                      <div className="font-medium">{asPct(selectedFeatureProps.winnerPct)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-gray-500">Party</div>
                      <div className="font-medium">
                        {selectedFeatureProps.party_simplified || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Vote %</div>
                      <div className="font-medium">{asPct(selectedFeatureProps.vote_pct)}</div>
                    </div>
                  </>
                )}

                {/* Expandable raw properties */}
                <details className="col-span-1 sm:col-span-2 mt-2">
                  <summary className="cursor-pointer text-gray-600">
                    More properties
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-64 rounded bg-gray-50 p-2">
{JSON.stringify(selectedFeatureProps, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500">
                Tip: Click any shape on the map to populate this panel with its data.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Mini map + EXACT charts beneath it (from tooltip) */}
        <div className="flex flex-col gap-4">
          <DistrictMiniMap
            dataUrl={
              selectedMap === 'house'
                ? '/data/demography.geojson'
                : '/data/state_demography.geojson'
            }
            selectedGeoId={selectedGeoId}
            onSelectGeoId={(gid) => {
              setSelectedGeoId(gid);
              // Optional: also attempt to mirror to the left details panel
              const fc = selectedMap === 'house' ? houseData : senateData;
              if (!fc) return;
              const hit = fc.features.find(f => {
                const p = (f.properties ?? {}) as Record<string, any>;
                const fid =
                  p.__GEOID__ ??
                  p.GEOID ??
                  p.geoid ??
                  p.GEOID20 ??
                  p.STATEFP ??
                  p.STUSPS ??
                  p.NAME;
                return String(fid ?? '') === String(gid ?? '');
              });
              setSelectedFeatureProps((hit?.properties as any) ?? null);
            }}
            onSelectDetails={(details) => {
              // This carries the exact same SVG charts built for the tooltip
              setMiniDetails(details);
            }}
          />

          {/* New: exact same charts beneath the second geo map */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">
                {miniDetails
                  ? miniDetails.name
                  : (selectedMap === 'house' ? 'District Demographics' : 'State Demographics')}
              </div>
              {miniDetails && (
                <button
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                  onClick={() => setMiniDetails(null)}
                >
                  Clear
                </button>
              )}
            </div>

            {miniDetails ? (
              <div className="px-4 py-4">
                {/* Render the same block we used in the tooltip (SVGs + header) */}
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: miniDetails.html }}
                />
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500">
                Click a {selectedMap === 'house' ? 'district' : 'state'} on the mini map to view the same charts here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

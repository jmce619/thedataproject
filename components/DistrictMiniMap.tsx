'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from 'geojson';
import type { Path, Layer, PathOptions, StyleFunction } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(m => m.GeoJSON), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });

const femaleVars = [
  'Female Under 5 years','Female 5 to 9 years','Female 10 to 14 years','Female 15 to 17 years',
  'Female 18 and 19 years','Female 20 years','Female 21 years','Female 22 to 24 years',
  'Female 25 to 29 years','Female 30 to 34 years','Female 35 to 39 years','Female 40 to 44 years',
  'Female 45 to 49 years','Female 50 to 54 years','Female 55 to 59 years','Female 60 and 61 years',
  'Female 62 to 64 years','Female 65 and 66 years','Female 67 to 69 years','Female 70 to 74 years',
  'Female 75 to 79 years','Female 80 to 84 years','Female 85 years and over'
];
const maleVars = [
  'Male Under 5 years','Male 5 to 9 years','Male 10 to 14 years','Male 15 to 17 years',
  'Male 18 and 19 years','Male 20 years','Male 21 years','Male 22 to 24 years',
  'Male 25 to 29 years','Male 30 to 34 years','Male 35 to 39 years','Male 40 to 44 years',
  'Male 45 to 49 years','Male 50 to 54 years','Male 55 to 59 years','Male 60 and 61 years',
  'Male 62 to 64 years','Male 65 and 66 years','Male 67 to 69 years','Male 70 to 74 years',
  'Male 75 to 79 years','Male 80 to 84 years','Male 85 years and over'
];

const raceVars = [
  'White alone',
  'Black or African American alone',
  'American Indian and Alaska Native alone',
  'Asian alone',
  'Native Hawaiian and Other Pacific Islander alone',
  'Some Other Race alone',
  'Population of two or more races:'
];

function sumProps(props: Record<string, any>, keys: string[]) {
  let s = 0;
  for (const k of keys) {
    const v = Number(props[k]);
    if (Number.isFinite(v)) s += v;
  }
  return s;
}

const AGE_BINS = ['0–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65–74', '75+'] as const;
type AgeBin = typeof AGE_BINS[number];

function binForAgeLabel(label: string): AgeBin {
  const base = label.replace(/^Male\s+|^Female\s+/, '');
  if (/(Under 5|5 to 9|10 to 14|15 to 17)/.test(base)) return '0–17';
  if (/(18 and 19|20 years|21 years|22 to 24)/.test(base)) return '18–24';
  if (/(25 to 29|30 to 34)/.test(base)) return '25–34';
  if (/(35 to 39|40 to 44)/.test(base)) return '35–44';
  if (/(45 to 49|50 to 54)/.test(base)) return '45–54';
  if (/(55 to 59|60 and 61 years|62 to 64)/.test(base)) return '55–64';
  if (/(65 and 66|67 to 69|70 to 74)/.test(base)) return '65–74';
  return '75+';
}

function aggregateAgeBins(props: Record<string, any>) {
  const bins: Record<AgeBin, { male: number; female: number }> = Object.fromEntries(
    AGE_BINS.map(b => [b, { male: 0, female: 0 }])
  ) as any;

  for (const key of maleVars) {
    const v = Number(props[key]);
    if (Number.isFinite(v)) bins[binForAgeLabel(key)].male += v;
  }
  for (const key of femaleVars) {
    const v = Number(props[key]);
    if (Number.isFinite(v)) bins[binForAgeLabel(key)].female += v;
  }
  return bins;
}

function pyramidSVG(bins: Record<AgeBin, { male: number; female: number }>, width = 240, height = 160) {
  const W = width, H = height, cx = W / 2, pad = 6;
  const n = AGE_BINS.length;
  const rowH = (H - pad * 2) / n;
  const barH = rowH * 0.7;
  const max = AGE_BINS.reduce((m, b) => Math.max(m, bins[b].male, bins[b].female), 1);
  const scale = (cx - 40) / max;

  const maleColor = '#60A5FA';
  const femaleColor = '#F9A8D4';
  const axis = `<line x1="${cx}" y1="${pad}" x2="${cx}" y2="${H - pad}" stroke="#111" stroke-width="1" />`;

  const rows = AGE_BINS.map((b, i) => {
    const y = pad + i * rowH + (rowH - barH) / 2;
    const mw = Math.max(1, bins[b].male * scale);
    const fw = Math.max(1, bins[b].female * scale);
    const labelY = y + barH / 2 + 3;

    return `
      <rect x="${cx - mw}" y="${y}" width="${mw}" height="${barH}" fill="${maleColor}" />
      <rect x="${cx}" y="${y}" width="${fw}" height="${barH}" fill="${femaleColor}" />
      <text x="${cx - mw - 4}" y="${labelY}" text-anchor="end" font-size="9" fill="#374151">${b}</text>
    `;
  }).join('');

  return `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Population pyramid">
      <rect x="0" y="0" width="${W}" height="${H}" fill="white" opacity="0" />
      ${axis}
      ${rows}
      <text x="${cx - 20}" y="12" text-anchor="end" font-size="10" fill="#111">Male</text>
      <text x="${cx + 20}" y="12" text-anchor="start" font-size="10" fill="#111">Female</text>
    </svg>
  `;
}

function raceBarsSVG(props: Record<string, any>, totalPop: number, width = 240, height = 120) {
  const pairs = raceVars.map(k => [k, Number(props[k]) || 0] as const);
  const top = pairs.sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...top.map(([, v]) => v));

  const W = width, H = height, pad = 8, gap = 6;
  const n = top.length;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2 - 14;
  const bw = innerW / n - gap;

  const palette = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

  const bars = top.map(([label, v], i) => {
    const h = Math.max(1, (v / max) * innerH);
    const x = pad + i * (bw + gap);
    const y = pad + (innerH - h) + 14;
    const abbrev =
      label === 'White alone' ? 'White' :
      label === 'Black or African American alone' ? 'Black' :
      label === 'American Indian and Alaska Native alone' ? 'AIAN' :
      label === 'Native Hawaiian and Other Pacific Islander alone' ? 'NHPI' :
      label.replace(':', '').split(' ')[0].slice(0, 6);

    const pct = totalPop ? ((v / totalPop) * 100).toFixed(0) + '%' : '';

    return `
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${palette[i % palette.length]}" />
      <text x="${x + bw / 2}" y="${y - 2}" text-anchor="middle" font-size="9" fill="#111">${pct}</text>
      <text x="${x + bw / 2}" y="${H - 2}" text-anchor="middle" font-size="9" fill="#374151">${abbrev}</text>
    `;
  }).join('');

  return `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Race/ethnicity">
      <rect x="0" y="0" width="${W}" height="${H}" fill="white" opacity="0" />
      <text x="${pad}" y="${pad + 10}" font-size="11" font-weight="600" fill="#111">Race/Ethnicity (top 5)</text>
      ${bars}
    </svg>
  `;
}

export type MiniMapDetails = {
  gid: string;
  name: string;
  total: number;
  femaleTotal: number;
  maleTotal: number;
  pyramidSVG: string;
  raceSVG: string;
  html: string;      // full block ready for dangerouslySetInnerHTML
  rawProps: Record<string, any>;
};

type FC = FeatureCollection<Geometry, GeoJsonProperties>;

export default function DistrictMiniMap({
  dataUrl = '/data/demography.geojson',
  selectedGeoId,
  onSelectGeoId,
  onSelectDetails, // NEW
}: {
  dataUrl?: string;
  selectedGeoId?: string | null;
  onSelectGeoId?: (geoid: string) => void;
  onSelectDetails?: (details: MiniMapDetails) => void; // NEW
}) {
  const [fc, setFc] = useState<FC | null>(null);
  const [error, setError] = useState<string | null>(null);
  const layerRef = useRef<Map<string, Layer>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(dataUrl);
        if (!res.ok) throw new Error(`Failed to load ${dataUrl} (${res.status})`);
        const json = (await res.json()) as FC;
        if (!cancelled) setFc(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load districts');
      }
    })();
    return () => { cancelled = true; };
  }, [dataUrl]);

  const mapOptions = useMemo(() => ({
    center: [37.8, -96] as [number, number],
    zoom: 4,
    attributionControl: false,
    zoomControl: true,
  }), []);

  const style: StyleFunction<GeoJsonProperties> = (feature): PathOptions => {
    if (!feature) return {};
    const props = (feature.properties ?? {}) as Record<string, any>;
    const gid = String(props.GEOID ?? props.geoid ?? props.GEOID20 ?? props.STATEFP ?? props.STUSPS ?? '');
    const isSel = !!selectedGeoId && gid === selectedGeoId;

    const femaleTotal = sumProps(props, femaleVars);
    const maleTotal = sumProps(props, maleVars);
    const totalPop = femaleTotal + maleTotal;

    const minPop = 5000;
    const maxPop = 1500000;
    const t = Math.max(0, Math.min(1, (totalPop - minPop) / (maxPop - minPop)));

    const interpolateColor = (start: string, end: string, t: number) => {
      const hex = (s: string) => parseInt(s, 16);
      const r = Math.round((1 - t) * hex(start.slice(1, 3)) + t * hex(end.slice(1, 3)));
      const g = Math.round((1 - t) * hex(start.slice(3, 5)) + t * hex(end.slice(3, 5)));
      const b = Math.round((1 - t) * hex(start.slice(5, 7)) + t * hex(end.slice(5, 7)));
      return `rgb(${r}, ${g}, ${b})`;
    };

    const fillColor = interpolateColor('#FEF3C7', '#b35c10', t);

    return {
      fillColor,
      fillOpacity: isSel ? 0.75 : 0.6,
      color: isSel ? '#1F2937' : '#374151',
      weight: isSel ? 2 : 0.5,
    };
  };

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!fc) return <div className="text-gray-500 text-sm">Loading districts…</div>;

  return (
    <MapContainer {...(mapOptions as any)} className="leaflet-container rounded-xl overflow-hidden shadow" style={{ height: 420 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
      <GeoJSON
        data={fc as FC}
        style={style}
        onEachFeature={(feature, layer) => {
          if (!feature) return;

          const props = (feature.properties ?? {}) as any;
          const gid = String(props.GEOID ?? props.geoid ?? props.GEOID20 ?? props.STATEFP ?? props.STUSPS ?? '');
          if (gid) layerRef.current.set(gid, layer);

          const name = props.NAMELSAD ?? props.NAME ?? 'District';
          const femaleTotal = sumProps(props, femaleVars);
          const maleTotal = sumProps(props, maleVars);
          const total = femaleTotal + maleTotal;

          const bins = aggregateAgeBins(props);
          const pyramid = pyramidSVG(bins, 240, 160);
          const race = raceBarsSVG(props, total, 240, 120);

          const tooltipHtml = `
            <div style="min-width: 520px; max-width: 560px; padding:6px 6px 4px 6px;">
              <div style="font-weight:600;margin-bottom:4px">${name}</div>
              <div style="display:flex; gap:8px; align-items:flex-start;">
                <div style="flex:1;">
                  <div style="font-size:12px;color:#374151;margin:0 0 4px 0">
                    <b>GEOID:</b> ${gid}&nbsp;&nbsp;
                    <b>Pop:</b> ${total.toLocaleString()}&nbsp;&nbsp;
                    <b>F:</b> ${femaleTotal.toLocaleString()}&nbsp;&nbsp;
                    <b>M:</b> ${maleTotal.toLocaleString()}
                  </div>
                  ${pyramid}
                </div>
                <div style="flex:1;">
                  ${race}
                </div>
              </div>
            </div>
          `;

          (layer as any).bindTooltip(tooltipHtml, {
            sticky: true,
            direction: 'top',
            opacity: 0.98,
            className: 'mini-tip',
          });

          layer.on({
            mouseover: () => (layer as Path).setStyle?.({ weight: 2, color: '#111' }),
            mouseout: () => {
              const isSel = !!selectedGeoId && gid === selectedGeoId;
              (layer as Path).setStyle?.({ weight: isSel ? 2 : 0.5, color: isSel ? '#1F2937' : '#374151' });
            },
            click: () => {
              if (gid && onSelectGeoId) onSelectGeoId(gid);

              // NEW: send same charts to parent so it can render beneath the map
              if (onSelectDetails) {
                const html = `
                  <div class="mini-detail">
                    <div style="font-weight:600;margin-bottom:6px">${name}</div>
                    <div style="display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap;">
                      <div style="flex:1; min-width:260px;">
                        <div style="font-size:12px;color:#374151;margin:0 0 6px 0">
                          <b>GEOID:</b> ${gid}&nbsp;&nbsp;
                          <b>Pop:</b> ${total.toLocaleString()}&nbsp;&nbsp;
                          <b>F:</b> ${femaleTotal.toLocaleString()}&nbsp;&nbsp;
                          <b>M:</b> ${maleTotal.toLocaleString()}
                        </div>
                        ${pyramid}
                      </div>
                      <div style="flex:1; min-width:260px;">
                        ${race}
                      </div>
                    </div>
                  </div>
                `;

                onSelectDetails({
                  gid, name, total,
                  femaleTotal, maleTotal,
                  pyramidSVG: pyramid,
                  raceSVG: race,
                  html,
                  rawProps: props
                });
              }
            }
          });
        }}
      />
    </MapContainer>
  );
}

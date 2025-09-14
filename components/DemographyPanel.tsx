'use client';

import { useEffect, useMemo, useState } from 'react';
import type { VisualizationSpec } from 'vega-embed';
import VegaLiteEmbed from './VegaLiteEmbed';

type Feature = { type: 'Feature'; properties: Record<string, any>; geometry: any };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

const variables_set_female_age = [
  'Female Under 5 years','Female 5 to 9 years','Female 10 to 14 years','Female 15 to 17 years',
  'Female 18 and 19 years','Female 20 years','Female 21 years','Female 22 to 24 years',
  'Female 25 to 29 years','Female 30 to 34 years','Female 35 to 39 years','Female 40 to 44 years',
  'Female 45 to 49 years','Female 50 to 54 years','Female 55 to 59 years','Female 60 and 61 years',
  'Female 62 to 64 years','Female 65 and 66 years','Female 67 to 69 years','Female 70 to 74 years',
  'Female 75 to 79 years','Female 80 to 84 years','Female 85 years and over'
];
const variables_set_male_age = [
  'Male Under 5 years','Male 5 to 9 years','Male 10 to 14 years','Male 15 to 17 years',
  'Male 18 and 19 years','Male 20 years','Male 21 years','Male 22 to 24 years',
  'Male 25 to 29 years','Male 30 to 34 years','Male 35 to 39 years','Male 40 to 44 years',
  'Male 45 to 49 years','Male 50 to 54 years','Male 55 to 59 years','Male 60 and 61 years',
  'Male 62 to 64 years','Male 65 and 66 years','Male 67 to 69 years','Male 70 to 74 years',
  'Male 75 to 79 years','Male 80 to 84 years','Male 85 years and over'
];
const variables_set_third = [
  'White alone','Black or African American alone','American Indian and Alaska Native alone','Asian alone',
  'Native Hawaiian and Other Pacific Islander alone','Some Other Race alone',
  'Population of two or more races:','Population of two races:','White; Black or African American',
  'White; American Indian and Alaska Native','White; Asian','White; Native Hawaiian and Other Pacific Islander',
  'White; Some Other Race','Black or African American; American Indian and Alaska Native','Black or African American; Asian',
  'Black or African American; Native Hawaiian and Other Pacific Islander','Black or African American; Some Other Race',
  'American Indian and Alaska Native; Asian','American Indian and Alaska Native; Native Hawaiian and Other Pacific Islander',
  'American Indian and Alaska Native; Some Other Race','Asian; Native Hawaiian and Other Pacific Islander',
  'Asian; Some Other Race','Native Hawaiian and Other Pacific Islander; Some Other Race'
];

const bar_vars = [...variables_set_female_age, ...variables_set_male_age, ...variables_set_third];
const age_order = variables_set_female_age.map(v => v.replace('Female ', ''));

function classifyGender(v: string) {
  if (v.startsWith('Male')) return 'Male';
  if (v.startsWith('Female')) return 'Female';
  return 'Other';
}

export default function DemographyPanel({
  dataUrl = '/data/demography.geojson',
  selectedGeoId,
}: {
  dataUrl?: string;
  selectedGeoId?: string | null;
}) {
  const [fc, setFc] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(dataUrl);
        if (!res.ok) throw new Error(`Failed to load ${dataUrl} (${res.status})`);
        const json = (await res.json()) as FeatureCollection;
        if (!cancelled) setFc(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load demographics');
      }
    })();
    return () => { cancelled = true; };
  }, [dataUrl]);

  const barData = useMemo(() => {
    if (!fc) return [];
    const rows: Array<{ GEOID: string; variable: string; value: number; gender: 'Male'|'Female'|'Other'; age_group: string }> = [];
    for (const f of fc.features) {
      const props = f.properties || {};
      const GEOID = String(props.GEOID ?? props.geoid ?? props.GEOID20 ?? '');
      if (!GEOID) continue;
      for (const v of bar_vars) {
        const raw = props[v];
        if (raw == null || raw === '') continue;
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        const gender = classifyGender(v) as 'Male'|'Female'|'Other';
        const age_group = v.replace(/^Male\s+|^Female\s+/, '');
        rows.push({ GEOID, variable: v, value, gender, age_group });
      }
    }
    return rows;
  }, [fc]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const r of barData) if ((r.gender === 'Male' || r.gender === 'Female') && r.value > m) m = r.value;
    return m || 1;
  }, [barData]);

  const pyramidSpec: VisualizationSpec = useMemo(() => ({
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 360,
    height: 240,
    data: { values: barData },
    transform: [
      { filter: "datum.gender != 'Other'" },
      ...(selectedGeoId ? [{ filter: { field: 'GEOID', equal: selectedGeoId } }] : []),
      { calculate: "datum.gender === 'Male' ? -datum.value : datum.value", as: 'adj_value' }
    ],
    layer: [
      {
        mark: { type: 'bar' },
        encoding: {
          y: { field: 'age_group', type: 'nominal', sort: age_order, axis: { title: 'Age Group', orient: 'right' } },
          x: { field: 'adj_value', type: 'quantitative', title: 'Population', scale: { domain: [-maxVal, maxVal] } },
          color: { field: 'gender', type: 'nominal', scale: { domain: ['Male','Female'], range: ['blue','pink'] } },
          tooltip: [
            { field: 'age_group', type: 'nominal' },
            { field: 'value', type: 'quantitative' },
            { field: 'gender', type: 'nominal' }
          ]
        }
      },
      { mark: { type: 'rule', color: 'black' }, encoding: { x: { datum: 0 } } }
    ]
  }), [barData, maxVal, selectedGeoId]);

  const thirdSpec: VisualizationSpec = useMemo(() => ({
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 360,
    height: 240,
    data: { values: barData },
    transform: [
      { filter: "datum.gender == 'Other'" },
      ...(selectedGeoId ? [{ filter: { field: 'GEOID', equal: selectedGeoId } }] : []),
    ],
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'variable', type: 'nominal', title: 'Race/Ethnicity', axis: { labelOverlap: true, labelLimit: 260 } },
      y: { field: 'value', type: 'quantitative', title: null },
      color: { field: 'variable', type: 'nominal', legend: null },
      tooltip: [{ field: 'variable', type: 'nominal' }, { field: 'value', type: 'quantitative' }]
    },
    resolve: { scale: { color: 'independent' } }
  }), [barData, selectedGeoId]);

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!fc) return <div className="text-gray-500 text-sm">Loading demographics…</div>;

  const hasRows = selectedGeoId ? barData.some(r => r.GEOID === selectedGeoId) : false;

  return (
    <div className="w-full flex flex-col gap-4">
      {selectedGeoId && hasRows ? (
        <>
          <VegaLiteEmbed spec={thirdSpec} />
          <VegaLiteEmbed spec={pyramidSpec} />
        </>
      ) : (
        <div className="text-xs text-gray-500 w-full h-[240px] flex items-center justify-center border rounded">
          Select a district/state to see demographics
        </div>
      )}
    </div>
  );
}

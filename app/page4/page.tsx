'use client';

import { useState, useEffect, useMemo } from 'react';
import CumulativeChart from '../../components/CumulativeChart';
import PremiumStackedBarChart from '../../components/PremiumStackedBarChart';
import RebasedChart from '../../components/RebasedChart';
import Table112Chart from '../../components/Table112Chart';
import YearOverYearChart from '../../components/YearOverYearChart';
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// --- Interactive line chart data interface & fetch
interface TidyData {
  Location: string;
  year: number;
  value: number;
}

// Reusable hook to detect mobile for tick styling
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// --- InteractiveLineChart component
function InteractiveLineChart() {
  const [tsData, setTsData] = useState<TidyData[]>([]);
  useEffect(() => {
    fetch('data/clean_data.json')
      .then(r => r.json())
      .then((d: TidyData[]) => {
        d.sort((a,b) => a.year - b.year);
        setTsData(d);
      })
      .catch(console.error);
  }, []);

  const states = Array.from(new Set(tsData.map(d => d.Location)));
  const stateColors: Record<string,string> = {
    Alabama: '#ff4d4f',
    Maine: '#1890ff',
    'New York': '#52c41a',
    'North Dakota': '#faad14',
    Tennessee: '#722ed1'
  };

  const yearMap: Record<number, any> = {};
  tsData.forEach(r => {
    yearMap[r.year] ??= { year: r.year };
    yearMap[r.year][r.Location] = r.value;
  });
  const chartData = Object.values(yearMap).sort((a,b) => a.year - b.year);

  return (
    <div style={{ width: '100%', height: 500, minWidth: 0, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {states.map((s, i) => (
            <Line
              key={s}
              dataKey={s}
              name={s}
              dot={false}
              stroke={stateColors[s] ?? '#000'}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- CleanDataPivotTable component
function CleanDataPivotTable() {
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    fetch('data/clean_data.json')
      .then(r => r.json())
      .then((data: TidyData[]) => {
        const ys = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
        const ss = Array.from(new Set(data.map(d => d.Location))).sort();
        setYears(ys);
        setStates(ss);
        setPivotData(
          ss.map(loc => {
            const row: any = { Location: loc };
            ys.forEach(y => {
              const rec = data.find(d => d.Location === loc && d.year === y);
              row[y] = rec?.value ?? '-';
            });
            return row;
          })
        );
      })
      .catch(console.error);
  }, []);

  return (
    <div className="mt-6 p-4 bg-gray-50 border rounded-lg overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left text-sm font-semibold">State</th>
            {years.map(y => (
              <th key={y} className="px-3 py-2 text-right text-sm font-semibold">{y}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {pivotData.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
              <td className="px-3 py-2 text-sm">{row.Location}</td>
              {years.map(y => (
                <td key={y} className="px-3 py-2 text-sm text-right">{row[y]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- ClaimDenialChart component
function ClaimDenialChart() {
  const isMobile = useIsMobile();
  const data = [
    { name: 'United Healthcare', rate: 33 },
    { name: 'Blue Cross', rate: 22 },
    { name: 'Aetna', rate: 22 },
    { name: 'Cigna', rate: 21 },
    { name: 'CareSource', rate: 21 },
    { name: 'Select Health', rate: 19 },
    { name: 'Anthem', rate: 18 },
    { name: 'Oscar', rate: 17 },
    { name: 'Superior Health', rate: 15 },
    { name: 'CHRISTUS', rate: 15 },
    { name: 'Ambetter', rate: 14 },
    { name: 'HealthOptions', rate: 14 },
    { name: 'Celtic', rate: 13 },
    { name: 'Kaiser', rate: 6 }
  ];

  return (
    <div style={{ width: '100%', height: 400, minWidth: 0, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, bottom: 5, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tick={isMobile ? false : { fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={isMobile ? false : { fontSize: 10 }}
          />
          <Tooltip />
          <Bar dataKey="rate">
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.name === 'United Healthcare'
                    ? 'red'
                    : d.name === 'Kaiser'
                    ? 'lightgreen'
                    : '#8884d8'
                }
              />
            ))}
            <LabelList
              dataKey="rate"
              position="insideRight"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: isMobile ? 8 : 10, fill: '#000' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- NewClaimBarChart component
function NewClaimBarChart() {
  const isMobile = useIsMobile();
  const data = [
    { state: 'FL', rate: 21.99 },
    { state: 'CA', rate: 20.52 },
    { state: 'NY', rate: 15.86 },
    { state: 'GA', rate: 14.82 },
    { state: 'NC', rate: 13.43 },
    { state: 'PA', rate: 12.55 },
    { state: 'IL', rate: 10.98 },
    { state: 'MI', rate: 10.90 },
    { state: 'VA', rate: 10.69 },
    { state: 'TX', rate: 9.55 }
  ];

  return (
    <div style={{ width: '100%', height: 400, minWidth: 0, minHeight: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="state"
            tick={isMobile ? false : { fontSize: 10 }}
            axisLine={!isMobile}
            tickLine={!isMobile}
          />
          <YAxis
            type="number"
            domain={[0, 'dataMax']}
            tick={isMobile ? false : { fontSize: 10 }}
            axisLine={!isMobile}
            tickLine={!isMobile}
          />
          <Tooltip />
          <Bar dataKey="rate" fill="#82ca9d">
            <LabelList
              dataKey="rate"
              position="top"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: isMobile ? 8 : 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Main page component
export default function StudyOnePage() {
  const [activeTab, setActiveTab] = useState<'cumulative'|'rebased'|'yoy'>('cumulative');

  const chartContent = useMemo(() => {
    if (activeTab === 'cumulative') return <CumulativeChart />;
    if (activeTab === 'rebased')    return <RebasedChart />;
    return <YearOverYearChart />;
  }, [activeTab]);

  const description = useMemo(() => {
    switch (activeTab) {
      case 'cumulative':
        return 'Cumulative % Change: …';
      case 'rebased':
        return 'Rebased to 100: …';
      case 'yoy':
      default:
        return 'Year over Year % Change: …';
    }
  }, [activeTab]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Premiums & Claims */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Premiums and Claims</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <InteractiveLineChart />
            <p className="text-xs text-center text-gray-500 mt-2">
              Marketplace Average Benchmark Premiums (2014–2025)<br/>
              Source: kff.org/affordable-care-act
            </p>
          </div>
          <div className="flex-1">
            <PremiumStackedBarChart />
            <p className="text-xs text-center text-gray-500 mt-2">
              Worker vs. Employer Premium Contributions (2000–2024)
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          Premiums were analyzed using the second-lowest cost silver benchmark for a 40-year-old…
        </p>
      </section>

      {/* Pivot Table */}
      <CleanDataPivotTable />

      {/* Claims Denial Rates */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Claims Denial Rates</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <ClaimDenialChart />
            <p className="text-xs text-center text-gray-500 mt-2">
              Denial Rates by Provider (2024)
            </p>
          </div>
          <div className="flex-1">
            <NewClaimBarChart />
            <p className="text-xs text-center text-gray-500 mt-2">
              Denial Rates by State (2020)
            </p>
          </div>
        </div>
      </section>

      {/* Table 1.12 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Rising Cost of Health Insurance</h2>
        <Table112Chart />
        <p className="text-xs text-center text-gray-500">
          Costs have outpaced inflation and deductibles have risen sharply.
        </p>
        <p className="text-sm text-gray-700">
          KFF data shows that employee shares and deductibles have both climbed significantly…
        </p>
      </section>

      {/* Tabbed Charts */}
      <section className="space-y-4">
        <div className="flex gap-6">
          {['cumulative','rebased','yoy'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-2 border-b-2 ${
                activeTab === tab
                  ? 'border-red-600 font-bold'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab === 'cumulative'
                ? 'Cumulative % Change'
                : tab === 'rebased'
                ? 'Rebased to 100'
                : 'YoY % Change'}
            </button>
          ))}
        </div>
        <div style={{ width: '100%', height: 500, minWidth: 0, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            {chartContent}
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-700">{description}</p>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
  Cell,
} from 'recharts';

/* =========================================================
   Shared helpers
========================================================= */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function parseDate(dateStr: string): Date {
  // Expecting "YYYY-MM-DD"
  return new Date(dateStr + 'T00:00:00');
}

/* =========================================================
   InteractiveLineChart (Premiums & Claims by state over time)
   Data: /data/clean_data.json  [{ Location, year, value }]
========================================================= */

interface TidyData {
  Location: string;
  year: number;
  value: number;
}

function InteractiveLineChart() {
  const [tsData, setTsData] = useState<TidyData[]>([]);

  useEffect(() => {
    fetch('/data/clean_data.json')
      .then(r => r.json())
      .then((d: TidyData[]) => {
        d.sort((a, b) => a.year - b.year);
        setTsData(d);
      })
      .catch(console.error);
  }, []);

  const states = useMemo(
    () => Array.from(new Set(tsData.map(d => d.Location))),
    [tsData]
  );

  const stateColors: Record<string, string> = {
    Alabama: '#ff4d4f',
    Maine: '#1890ff',
    'New York': '#52c41a',
    'North Dakota': '#faad14',
    Tennessee: '#722ed1',
  };

  // Pivot to {year, [state]: value}
  const chartData = useMemo(() => {
    const yearMap: Record<number, any> = {};
    tsData.forEach(r => {
      yearMap[r.year] ??= { year: r.year };
      yearMap[r.year][r.Location] = r.value;
    });
    return Object.values(yearMap).sort((a: any, b: any) => a.year - b.year);
  }, [tsData]);

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {states.map((s) => (
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

/* =========================================================
   Premiums Table by State & Year
   Data: /data/clean_data.json  [{ Location, year, value }]
========================================================= */

function CleanDataPivotTable() {
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    fetch('/data/clean_data.json')
      .then(r => r.json())
      .then((data: TidyData[]) => {
        const ys = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
        const states = Array.from(new Set(data.map(d => d.Location))).sort();
        setYears(ys);

        const rows = states.map(loc => {
          const row: Record<string, any> = { Location: loc };
          ys.forEach(y => {
            const rec = data.find(d => d.Location === loc && d.year === y);
            row[y] = rec?.value ?? null;
          });
          return row;
        });

        setPivotData(rows);
      })
      .catch(console.error);
  }, []);

  const formatCell = (v: number | null) =>
    v === null ? '—' : Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);

  return (
    <div className="premiums-table-wrapper">
      <table className="premiums-table">
        <thead>
          <tr>
            <th className="sticky-col">State</th>
            {years.map(y => (
              <th key={y} className="num">{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pivotData.map((row, i) => (
            <tr key={row.Location} className={i % 2 ? 'odd' : ''}>
              <td className="sticky-col state-cell" title={row.Location}>{row.Location}</td>
              {years.map(y => (
                <td key={y} className="num">{formatCell(row[y])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   Denial Rates by Provider (horizontal bars)
   Static example data
========================================================= */

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
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
          <XAxis type="number" domain={[0, 'dataMax']} tick={isMobile ? false : { fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={120} tick={isMobile ? false : { fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="rate" barSize={20}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.name === 'United Healthcare' ? 'red'
                    : d.name === 'Kaiser' ? 'lightgreen'
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

/* =========================================================
   Denial Rates by State (vertical columns)
   Static example data
========================================================= */

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
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
          <XAxis dataKey="state" tick={isMobile ? false : { fontSize: 10 }} axisLine={!isMobile} tickLine={!isMobile} />
          <YAxis type="number" domain={[0, 'dataMax']} tick={isMobile ? false : { fontSize: 10 }} axisLine={!isMobile} tickLine={!isMobile} />
          <Tooltip />
          <Bar dataKey="rate" fill="#82ca9d" barSize={30}>
            <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: isMobile ? 8 : 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =========================================================
   Table 1.12 (Working inline version)
   -> Aggregates clean_data.json by year to show the average value per year.
========================================================= */

type YearAgg = { year: number; avg: number };

function Table112Chart() {
  const [data, setData] = useState<YearAgg[]>([]);

  useEffect(() => {
    fetch('/data/clean_data.json')
      .then(r => r.json())
      .then((rows: TidyData[]) => {
        // group by year and average
        const byYear = new Map<number, number[]>();
        rows.forEach(r => {
          if (!byYear.has(r.year)) byYear.set(r.year, []);
          byYear.get(r.year)!.push(r.value);
        });
        const agg = Array.from(byYear.entries())
          .map(([year, vals]) => ({
            year,
            avg: vals.reduce((a, b) => a + b, 0) / vals.length
          }))
          .sort((a, b) => a.year - b.year);
        setData(agg);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="avg" name="Average Premium (All States)" stroke="#ff7300" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =========================================================
   Tabbed Charts (Cumulative / Rebased / YoY)
   -> Working inline versions fetching /data/combined_stock_income.json
========================================================= */

type StockPoint = { Date: string; Close: number };
type IncomePoint = { Date: string; Income: number };
type CombinedJSON = {
  unh_data?: StockPoint[];
  centene_data?: StockPoint[];
  cigna_data?: StockPoint[];
  aetna_data?: StockPoint[];
  median_income?: IncomePoint[];
};

function useMergedStockIncome() {
  const [merged, setMerged] = useState<any[]>([]);

  useEffect(() => {
    fetch('/data/combined_stock_income.json')
      .then(r => r.json())
      .then((combined: CombinedJSON) => {
        const unh = combined.unh_data ?? [];
        const centene = combined.centene_data ?? [];
        const cigna = combined.cigna_data ?? [];
        const aetna = combined.aetna_data ?? [];
        const income = (combined.median_income ?? []).slice().sort(
          (a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime()
        );

        // Pointer for income (latest <= current date)
        let incIdx = 0;
        const out: any[] = [];
        const n = Math.min(unh.length, Math.max(centene.length, cigna.length, aetna.length, unh.length));
        for (let i = 0; i < n; i++) {
          const d = unh[i];
          if (!d) continue;
          const curDate = parseDate(d.Date);
          while (incIdx < income.length - 1 && parseDate(income[incIdx + 1].Date) <= curDate) {
            incIdx++;
          }
          out.push({
            Date: d.Date,
            UNH: d.Close,
            Centene: centene[i]?.Close ?? null,
            Cigna: cigna[i]?.Close ?? null,
            Aetna: aetna[i]?.Close ?? null,
            Income: income[incIdx]?.Income ?? income[0]?.Income ?? null,
          });
        }
        setMerged(out);
      })
      .catch(console.error);
  }, []);

  return merged;
}

function CumulativeChartInline() {
  const merged = useMergedStockIncome();

  const data = useMemo(() => {
    if (!merged.length) return [];
    const first = merged[0];
    const fUNH = first.UNH;
    const fCen = first.Centene;
    const fCig = first.Cigna;
    const fAet = first.Aetna;
    const fInc = first.Income;

    return merged.map(r => ({
      Date: r.Date,
      CumUNH: ((r.UNH - fUNH) / fUNH) * 100,
      CumCentene: fCen && r.Centene ? ((r.Centene - fCen) / fCen) * 100 : null,
      CumCigna: fCig && r.Cigna ? ((r.Cigna - fCig) / fCig) * 100 : null,
      CumAetna: fAet && r.Aetna ? ((r.Aetna - fAet) / fAet) * 100 : null,
      CumIncome: fInc ? ((r.Income - fInc) / fInc) * 100 : null,
    }));
  }, [merged]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="Date" tickFormatter={(t) => new Date(t).getFullYear().toString()} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 10 }} />
        <Line type="monotone" dataKey="CumUNH" name="UNH" stroke="red" dot={false} />
        <Line type="monotone" dataKey="CumCentene" name="Centene" stroke="blue" dot={false} />
        <Line type="monotone" dataKey="CumCigna" name="Cigna" stroke="green" dot={false} />
        <Line type="monotone" dataKey="CumAetna" name="Aetna" stroke="orange" dot={false} />
        <Line type="monotone" dataKey="CumIncome" name="Median Income" stroke="black" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RebasedChartInline() {
  const merged = useMergedStockIncome();

  const data = useMemo(() => {
    if (!merged.length) return [];
    const first = merged[0];
    return merged.map(r => ({
      Date: r.Date,
      RebasedUNH: (r.UNH / first.UNH) * 100,
      RebasedCentene: first.Centene && r.Centene ? (r.Centene / first.Centene) * 100 : null,
      RebasedCigna: first.Cigna && r.Cigna ? (r.Cigna / first.Cigna) * 100 : null,
      RebasedAetna: first.Aetna && r.Aetna ? (r.Aetna / first.Aetna) * 100 : null,
      RebasedIncome: first.Income ? (r.Income / first.Income) * 100 : null,
    }));
  }, [merged]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="Date" tickFormatter={(t) => new Date(t).getFullYear().toString()} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 10 }} />
        <Line type="monotone" dataKey="RebasedUNH" name="UNH" stroke="red" dot={false} />
        <Line type="monotone" dataKey="RebasedCentene" name="Centene" stroke="blue" dot={false} />
        <Line type="monotone" dataKey="RebasedCigna" name="Cigna" stroke="green" dot={false} />
        <Line type="monotone" dataKey="RebasedAetna" name="Aetna" stroke="orange" dot={false} />
        <Line type="monotone" dataKey="RebasedIncome" name="Median Income" stroke="black" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function subtractOneYear(date: Date): string {
  const y = date.getFullYear() - 1;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function YearOverYearChartInline() {
  const merged = useMergedStockIncome();

  const data = useMemo(() => {
    if (!merged.length) return [];
    const byDate: Record<string, any> = {};
    merged.forEach(r => (byDate[r.Date] = r));

    return merged.map(r => {
      const prev = byDate[subtractOneYear(parseDate(r.Date))];
      if (!prev) {
        return { Date: r.Date, YOYUNH: null, YOYCentene: null, YOYCigna: null, YOYAetna: null, YOYIncome: null };
      }
      return {
        Date: r.Date,
        YOYUNH: ((r.UNH - prev.UNH) / prev.UNH) * 100,
        YOYCentene: prev.Centene && r.Centene ? ((r.Centene - prev.Centene) / prev.Centene) * 100 : null,
        YOYCigna: prev.Cigna && r.Cigna ? ((r.Cigna - prev.Cigna) / prev.Cigna) * 100 : null,
        YOYAetna: prev.Aetna && r.Aetna ? ((r.Aetna - prev.Aetna) / prev.Aetna) * 100 : null,
        YOYIncome: prev.Income ? ((r.Income - prev.Income) / prev.Income) * 100 : null,
      };
    });
  }, [merged]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="Date" tickFormatter={(t) => new Date(t).getFullYear().toString()} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 10 }} />
        <Line type="monotone" dataKey="YOYUNH" name="UNH" stroke="red" dot={false} />
        <Line type="monotone" dataKey="YOYCentene" name="Centene" stroke="blue" dot={false} />
        <Line type="monotone" dataKey="YOYCigna" name="Cigna" stroke="green" dot={false} />
        <Line type="monotone" dataKey="YOYAetna" name="Aetna" stroke="orange" dot={false} />
        <Line type="monotone" dataKey="YOYIncome" name="Median Income" stroke="black" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* =========================================================
   Page
========================================================= */

export default function StudyOnePage() {
  const [activeTab, setActiveTab] = useState<'cumulative' | 'rebased' | 'yoy'>('cumulative');

  const chartContent = useMemo(() => {
    if (activeTab === 'cumulative') return <CumulativeChartInline />;
    if (activeTab === 'rebased') return <RebasedChartInline />;
    return <YearOverYearChartInline />;
  }, [activeTab]);

  const description = useMemo(() => {
    switch (activeTab) {
      case 'cumulative': return 'Cumulative % Change: …';
      case 'rebased':    return 'Rebased to 100: …';
      case 'yoy':
      default:           return 'Year over Year % Change: …';
    }
  }, [activeTab]);

  return (
    <div className="page-container">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-12 space-y-16">

          {/* Premiums & Claims (left) + Denial by Provider (right) */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Premiums and Claims</h2>
            <div className="pc-two-col">
              <div className="pc-card">
                <InteractiveLineChart />
                <p className="text-xs text-center text-gray-500 mt-2">
                  Marketplace Average Benchmark Premiums (2014–2025)<br />
                  <span className="italic">Source: kff.org/affordable-care-act</span>
                </p>
              </div>
              <div className="pc-card">
                <ClaimDenialChart />
                <p className="text-xs text-center text-gray-500 mt-2">
                  Denial Rates by Provider (2024)
                </p>
              </div>
            </div>

            {/* Full-width below */}
            <div className="bg-white rounded-2xl shadow p-4 flex flex-col mt-8">
              {/* If you have a separate premiums stacked dataset, drop it here. */}
              {/* Using your existing static component shape */}
              {/* (This is illustrative—feel free to hide if you don't need it) */}
              <p className="text-sm text-gray-700">
                Worker vs. Employer Premium Contributions (2000–2024)
              </p>
            </div>
          </section>

          {/* Premiums Table + Denial by State (vertical columns) */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Premiums by State & Denial Rates</h2>
            <div className="pc-two-col">
              <div className="pc-card">
                <h3 className="text-lg font-semibold mb-2">Premiums Table by State & Year</h3>
                <CleanDataPivotTable />
              </div>
              <div className="pc-card">
                <NewClaimBarChart />
                <p className="text-xs text-center text-gray-500 mt-2">
                  Denial Rates by State (2020)
                </p>
              </div>
            </div>
          </section>

          {/* Table 1.12 (works with your clean_data.json) */}
          <section>
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-2xl font-bold mb-2">Rising Cost of Health Insurance</h2>
              <Table112Chart />
              <p className="text-xs text-center text-gray-500 mt-2">
                Costs have outpaced inflation and deductibles have risen sharply.
              </p>
              <p className="text-sm text-gray-700 mt-2">
                KFF data shows that employee shares and deductibles have both climbed significantly…
              </p>
            </div>
          </section>

          {/* Tabbed Charts (use inline working charts; NO extra ResponsiveContainer here) */}
          <section>
            <div className="flex gap-6 mb-4">
              {['cumulative', 'rebased', 'yoy'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-red-600 font-bold text-red-600'
                      : 'border-transparent text-gray-500 hover:text-red-500'
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
            <div className="bg-white rounded-2xl shadow p-4">
              <div style={{ width: '100%', height: 500 }}>
                {chartContent}
              </div>
              <p className="text-sm text-gray-700 mt-3">{description}</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

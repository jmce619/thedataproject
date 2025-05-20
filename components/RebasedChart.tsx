'use client';

import { useMemo } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import combinedData from '../public/data/combined_stock_income.json';

/** Convert a "YYYY-MM-DD" string into a Date object */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Merge stock and income data.
 */
function mergeStockAndIncomeData() {
  const unhData = combinedData.unh_data || [];
  const centeneData = combinedData.centene_data || [];
  const cignaData = combinedData.cigna_data || [];
  const aetnaData = combinedData.aetna_data || [];
  const incomeData = combinedData.median_income || [];

  const sortedIncome = [...incomeData].sort(
    (a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime()
  );
  const baselineIncome = sortedIncome[0]?.Income;

  let incomeIndex = 0;
  const merged = unhData.map((record, i) => {
    const currentDate = parseDate(record.Date);
    while (
      incomeIndex < sortedIncome.length - 1 &&
      parseDate(sortedIncome[incomeIndex + 1]!.Date).getTime() <= currentDate.getTime()
    ) {
      incomeIndex++;
    }
    return {
      Date: record.Date,
      UNH: record.Close,
      Centene: centeneData[i] ? centeneData[i].Close : null,
      Cigna: cignaData[i] ? cignaData[i].Close : null,
      Aetna: aetnaData[i] ? aetnaData[i].Close : null,
      Income: sortedIncome[incomeIndex]?.Income ?? baselineIncome
    };
  });
  return merged;
}

/**
 * Compute rebased values so that the first record equals 100.
 */
function rebasedData(data: any[]) {
  if (!data.length) return [];
  const sorted = [...data].sort((a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime());
  const first = sorted[0];
  return sorted.map(row => ({
    Date: row.Date,
    RebasedUNH: (row.UNH / first.UNH) * 100,
    RebasedCentene:
      first.Centene !== null && row.Centene !== null ? (row.Centene / first.Centene) * 100 : null,
    RebasedCigna:
      first.Cigna !== null && row.Cigna !== null ? (row.Cigna / first.Cigna) * 100 : null,
    RebasedAetna:
      first.Aetna !== null && row.Aetna !== null ? (row.Aetna / first.Aetna) * 100 : null,
    RebasedIncome: (row.Income / first.Income) * 100
  }));
}

export default function RebasedChart() {
  const mergedData = useMemo(() => mergeStockAndIncomeData(), []);
  const rebased = useMemo(() => rebasedData(mergedData), [mergedData]);

  return (
    <div className="w-full h-full p-1 relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rebased} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="Date"
            tickFormatter={(tick) => new Date(tick).getFullYear().toString()}
            tick={{ fontSize: '10px' }}
          />
          <YAxis tick={{ fontSize: '10px' }} />
          <Tooltip contentStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="RebasedUNH" name="UNH" stroke="red" dot={false} />
          <Line type="monotone" dataKey="RebasedCentene" name="Centene" stroke="blue" dot={false} />
          <Line type="monotone" dataKey="RebasedCigna" name="Cigna" stroke="green" dot={false} />
          <Line type="monotone" dataKey="RebasedAetna" name="Aetna" stroke="orange" dot={false} />
          <Line type="monotone" dataKey="RebasedIncome" name="Median Income" stroke="black" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      
    </div>
  );
}
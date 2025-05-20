// components/CumulativeChart.tsx
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

/** Parse a "YYYY-MM-DD" string into a Date object */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Merge daily stock data with annual median income data.
 * This version creates merged records only for dates when median income is recorded.
 */
function mergeStockAndIncomeData() {
  const unhData = combinedData.unh_data || [];
  const centeneData = combinedData.centene_data || [];
  const cignaData = combinedData.cigna_data || [];
  const aetnaData = combinedData.aetna_data || [];
  const incomeData = combinedData.median_income || [];

  // Sort median income data by date
  const sortedIncome = [...incomeData].sort(
    (a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime()
  );
  // Use the first income value as a fallback baseline if needed.
  const baselineIncome = sortedIncome[0]!.Income;

  // Pointer for stock data
  let stockIndex = 0;

  const merged = sortedIncome.map((incomeRecord) => {
    const incomeDate = parseDate(incomeRecord.Date);

    // Move the pointer until we find the first stock record with a date after the income date.
    while (
      stockIndex < unhData.length &&
      parseDate(unhData[stockIndex]!.Date).getTime() <= incomeDate.getTime()
    ) {
      stockIndex++;
    }
    // The record we want is the last one on or before the income date.
    const matchedIndex = stockIndex > 0 ? stockIndex - 1 : 0;
    const stockRecord = unhData[matchedIndex];

    return {
      Date: incomeRecord.Date, // Use the income date as the merged date
      UNH: stockRecord!.Close,
      Centene: centeneData[matchedIndex] ? centeneData[matchedIndex].Close : null,
      Cigna: cignaData[matchedIndex] ? cignaData[matchedIndex].Close : null,
      Aetna: aetnaData[matchedIndex] ? aetnaData[matchedIndex].Close : null,
      Income: incomeRecord.Income
    };
  });

  return merged;
}

/**
 * Compute cumulative percentage change relative to the first record.
 */
function cumulativePercentChange(
  data: Array<{
    Date: string;
    UNH: number;
    Centene: number | null;
    Cigna: number | null;
    Aetna: number | null;
    Income: number;
  }>
) {
  if (!data.length) return [];
  const sorted = [...data].sort(
    (a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime()
  );
  const firstUNH = sorted[0]!.UNH;
  const firstCentene = sorted[0]!.Centene;
  const firstCigna = sorted[0]!.Cigna;
  const firstAetna = sorted[0]!.Aetna;
  const firstIncome = sorted[0]!.Income;

  return sorted.map(row => ({
    Date: row.Date,
    CumUNH: ((row.UNH - firstUNH) / firstUNH) * 100,
    CumCentene:
      firstCentene !== null && row.Centene !== null
        ? ((row.Centene - firstCentene) / firstCentene) * 100
        : null,
    CumCigna:
      firstCigna !== null && row.Cigna !== null
        ? ((row.Cigna - firstCigna) / firstCigna) * 100
        : null,
    CumAetna:
      firstAetna !== null && row.Aetna !== null
        ? ((row.Aetna - firstAetna) / firstAetna) * 100
        : null,
    CumIncome: ((row.Income - firstIncome) / firstIncome) * 100
  }));
}

export default function CumulativeChart() {
  const mergedData = useMemo(() => mergeStockAndIncomeData(), []);
  const cumData = useMemo(() => cumulativePercentChange(mergedData), [mergedData]);

  return (
    // Use h-full to allow the parent container to control the size.
    <div className="w-full h-full p-1 relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cumData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="Date"
            tickFormatter={(tick) => new Date(tick).getFullYear().toString()}
            tick={{ fontSize: '10px' }}
          />
          <YAxis tick={{ fontSize: '10px' }} />
          <Tooltip contentStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="CumUNH" name="UNH" stroke="red" dot={false} />
          <Line type="monotone" dataKey="CumCentene" name="Centene" stroke="blue" dot={false} />
          <Line type="monotone" dataKey="CumCigna" name="Cigna" stroke="green" dot={false} />
          <Line type="monotone" dataKey="CumAetna" name="Aetna" stroke="orange" dot={false} />
          <Line type="monotone" dataKey="CumIncome" name="Median Income" stroke="black" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {/* Custom legend overlay */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 70,
          fontSize: '9px',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          padding: '5px',
          borderRadius: '4px'
        }}
      >
        <div style={{ color: 'red' }}>UNH</div>
        <div style={{ color: 'blue' }}>Centene</div>
        <div style={{ color: 'green' }}>Cigna</div>
        <div style={{ color: 'orange' }}>Aetna</div>
        <div style={{ color: 'black' }}>Median Income</div>
      </div>
    </div>
  );
}
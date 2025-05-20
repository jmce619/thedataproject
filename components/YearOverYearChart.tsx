// components/YearOverYearChart.tsx
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
 * Given a Date object, return a string for the date exactly one year earlier in "YYYY-MM-DD" format.
 */
function subtractOneYear(date: Date): string {
  const year = date.getFullYear() - 1;
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute the year over year percentage change.
 */
function yearOverYearData(data: any[]) {
  if (!data.length) return [];
  const sorted = [...data].sort(
    (a, b) => parseDate(a.Date).getTime() - parseDate(b.Date).getTime()
  );
  // Build a lookup dictionary for exact date matching.
  const dataByDate = sorted.reduce((acc, item) => {
    acc[item.Date] = item;
    return acc;
  }, {} as Record<string, any>);

  return sorted.map(row => {
    const currentDate = parseDate(row.Date);
    const targetDateStr = subtractOneYear(currentDate);
    const prev = dataByDate[targetDateStr];
    if (!prev) {
      return {
        Date: row.Date,
        YOYUNH: null,
        YOYCentene: null,
        YOYCigna: null,
        YOYAetna: null,
        YOYIncome: null
      };
    }
    return {
      Date: row.Date,
      YOYUNH: ((row.UNH - prev.UNH) / prev.UNH) * 100,
      YOYCentene:
        prev.Centene !== null && row.Centene !== null
          ? ((row.Centene - prev.Centene) / prev.Centene) * 100
          : null,
      YOYCigna:
        prev.Cigna !== null && row.Cigna !== null
          ? ((row.Cigna - prev.Cigna) / prev.Cigna) * 100
          : null,
      YOYAetna:
        prev.Aetna !== null && row.Aetna !== null
          ? ((row.Aetna - prev.Aetna) / prev.Aetna) * 100
          : null,
      YOYIncome: ((row.Income - prev.Income) / prev.Income) * 100
    };
  });
}

export default function YearOverYearChart() {
  const mergedData = useMemo(() => mergeStockAndIncomeData(), []);
  const yoyData = useMemo(() => yearOverYearData(mergedData), [mergedData]);

  return (
    <div className="w-full h-full p-1 relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={yoyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="Date"
            tickFormatter={(tick) => new Date(tick).getFullYear().toString()}
            tick={{ fontSize: '10px' }}
          />
          <YAxis tick={{ fontSize: '10px' }} />
          <Tooltip contentStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="YOYUNH" name="UNH" stroke="red" dot={false} />
          <Line type="monotone" dataKey="YOYCentene" name="Centene" stroke="blue" dot={false} />
          <Line type="monotone" dataKey="YOYCigna" name="Cigna" stroke="green" dot={false} />
          <Line type="monotone" dataKey="YOYAetna" name="Aetna" stroke="orange" dot={false} />
          <Line type="monotone" dataKey="YOYIncome" name="Median Income" stroke="black" dot={false} />
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
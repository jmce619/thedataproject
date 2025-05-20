'use client';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

interface PremiumData {
  year: string;
  employer: number;
  worker: number;
  total: number;
}

const premiumData: PremiumData[] = [
  { year: '2000', employer: 4819, worker: 1619, total: 6438 },
  { year: '2002', employer: 5866, worker: 2137, total: 8003 },
  { year: '2004', employer: 7289, worker: 2661, total: 9950 },
  { year: '2006', employer: 8508, worker: 2973, total: 11480 },
  { year: '2008', employer: 9325, worker: 3354, total: 12680 },
  { year: '2010', employer: 9773, worker: 3997, total: 13770 },
  { year: '2012', employer: 11429, worker: 4316, total: 15745 },
  { year: '2014', employer: 12011, worker: 4823, total: 16834 },
  { year: '2016', employer: 12865, worker: 5277, total: 18142 },
  { year: '2018', employer: 14069, worker: 5547, total: 19616 },
  { year: '2020', employer: 15754, worker: 5588, total: 21342 },
  { year: '2022', employer: 16357, worker: 6106, total: 22463 },
  { year: '2023', employer: 17393, worker: 6575, total: 23968 },
  { year: '2024', employer: 19276, worker: 6296, total: 25572 },
  // Add more data as needed...
];

export default function PremiumStackedBarChart() {
  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={premiumData}
          // Reduced left/right margins to spread the chart horizontally
          margin={{ top: 20, right: 5, bottom: 20, left: 5}}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 'dataMax + 1000']}
            tick={{ fontSize: 10 }}
          />
          <YAxis dataKey="year" type="category" tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 10 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar
            dataKey="employer"
            stackId="premium"
            fill="#4185F4"
            name="Employer Contribution"
            barSize={20}
          />
          <Bar
            dataKey="worker"
            stackId="premium"
            fill="#3cba54"
            name="Worker Contribution"
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
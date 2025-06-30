"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HomaIRDataPoint {
  date: Date;
  homaIR: number;
}

export default function HomaIRChartClient({
  data,
}: {
  data: HomaIRDataPoint[];
}) {
  const chartData = data.map((point) => ({
    date: point.date.getTime(),
    "HOMA-IR": point.homaIR,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="HOMA-IR"
          stroke="#82ca9d"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

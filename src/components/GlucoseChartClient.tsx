"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface GlucoseDataPoint {
  date: number;
  value: number;
}

export default function GlucoseChartClient({
  data,
}: {
  data: GlucoseDataPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
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
        <YAxis
          domain={[
            "dataMin - 2",
            (dataMax: number) => Math.max(dataMax + 2, 102),
          ]}
        />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
        />
        <Legend />
        <ReferenceLine y={100} stroke="red" label="100" />
        <Line
          type="monotone"
          dataKey="value"
          name="Glucose (mg/dL)"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

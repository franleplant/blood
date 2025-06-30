"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BloodMarker {
  id: number;
  marker_name_en: string;
  value: string;
  unit: string;
  date: string;
}

export default function GlucoseChart({ data }: { data: BloodMarker[] }) {
  const glucoseData = data.filter(
    (marker) => marker.marker_name_en === "Glucose"
  );

  return (
    <LineChart
      width={500}
      height={300}
      data={glucoseData}
      margin={{
        top: 5,
        right: 30,
        left: 20,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line
        type="monotone"
        dataKey="value"
        stroke="#8884d8"
        activeDot={{ r: 8 }}
      />
    </LineChart>
  );
}

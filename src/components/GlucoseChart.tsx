"use client";

import { LabResultsRow } from "@/lib/schemas/labResultsRow";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function GlucoseChart({ data }: { data: LabResultsRow[] }) {
  const glucoseData = data
    .filter((marker) => marker.marker_name_en === "Glucose")
    .map((marker) => ({
      ...marker,
      date: marker.date.toLocaleDateString(),
      value: Number(marker.value),
    }));

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

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

interface HomaIRDataPoint {
  date: Date;
  homaIR: number;
}

interface EventDataPoint {
  date: Date;
  title: string;
  description: string;
}

export default function HomaIRChartClient({
  data,
  events,
}: {
  data: HomaIRDataPoint[];
  events: EventDataPoint[];
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
        <YAxis
          domain={["auto", (dataMax: number) => Math.max(dataMax + 0.2, 2.2)]}
        />
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        <ReferenceLine
          y={2}
          stroke="red"
          strokeDasharray="5 5"
          label={{
            value: "Insulin Resistance (2.0)",
            position: "insideLeft",
            offset: 10,
          }}
        />
        {events.map((event, index) => (
          <ReferenceLine
            key={index}
            x={event.date.getTime()}
            stroke="#ff7300"
            strokeDasharray="5 5"
            label={{
              value: event.title,
              offset: 10,
              position: "top",
              style: {
                fontSize: "12px",
                fill: "#ff7300",
                fontWeight: "bold",
              },
            }}
          />
        ))}
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

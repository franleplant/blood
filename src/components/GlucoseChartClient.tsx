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

interface EventDataPoint {
  date: Date;
  title: string;
  description: string;
}

export default function GlucoseChartClient({
  data,
  events,
}: {
  data: GlucoseDataPoint[];
  events: EventDataPoint[];
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
        {events.map((event, index) => (
          <ReferenceLine
            key={index}
            x={event.date.getTime()}
            stroke="#ff7300"
            strokeDasharray="5 5"
            label={{
              value: event.title,
              offset: 10,
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
          dataKey="value"
          name="Glucose (mg/dL)"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

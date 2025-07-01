"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
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

interface ChartDataPoint {
  date: number;
  homaIR?: number;
  eventValue?: number;
  eventTitle?: string;
  eventDescription?: string;
}

export default function HomaIRChartClient({
  data,
  events,
}: {
  data: HomaIRDataPoint[];
  events: EventDataPoint[];
}) {
  // Filter events for medication events
  const medicationEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes("metofirm") ||
      e.title.toLowerCase().includes("ozempic")
  );

  // Combine HOMA-IR data and events into a single dataset
  const chartData: ChartDataPoint[] = [
    // Add HOMA-IR data points
    ...data.map((point) => ({
      date: point.date.getTime(),
      homaIR: point.homaIR,
    })),
    // Add event data points (positioned at a fixed HOMA-IR level for visibility)
    ...medicationEvents.map((event) => ({
      date: event.date.getTime(),
      eventValue: 0.5, // Fixed position for events on the chart
      eventTitle: event.title,
      eventDescription: event.description,
    })),
  ].sort((a, b) => a.date - b.date);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
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
          padding={{ left: 10, right: 10 }}
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
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white p-2 border rounded shadow">
                  <p className="font-semibold">
                    {new Date(label as number).toLocaleDateString()}
                  </p>
                  {payload.map((entry, index) => {
                    if (entry.dataKey === "homaIR" && entry.value) {
                      return (
                        <p key={index} style={{ color: entry.color }}>
                          HOMA-IR: {(entry.value as number).toFixed(2)}
                        </p>
                      );
                    }
                    if (entry.dataKey === "eventValue" && entry.payload) {
                      const data = entry.payload as ChartDataPoint;
                      return (
                        <div key={index} style={{ color: entry.color }}>
                          <p className="font-semibold">{data.eventTitle}</p>
                          <p className="text-sm">{data.eventDescription}</p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            }
            return null;
          }}
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

        {/* Line chart for HOMA-IR data */}
        <Line
          type="monotone"
          dataKey="homaIR"
          name="HOMA-IR"
          stroke="#82ca9d"
          strokeWidth={2}
          activeDot={{ r: 8 }}
          connectNulls={true}
        />

        {/* Scatter plot for events */}
        <Scatter
          dataKey="eventValue"
          name="Events"
          fill="#ff7300"
          shape="diamond"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

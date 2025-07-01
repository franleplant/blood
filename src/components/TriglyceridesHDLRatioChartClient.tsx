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

interface TriglyceridesHDLRatioDataPoint {
  date: Date;
  triglyceridesHDLRatio: number;
  triglycerides: number;
  hdl: number;
}

interface EventDataPoint {
  date: Date;
  title: string;
  description: string;
}

interface ChartDataPoint {
  date: number;
  ratio?: number;
  triglycerides?: number;
  hdl?: number;
  eventValue?: number;
  eventTitle?: string;
  eventDescription?: string;
}

export default function TriglyceridesHDLRatioChartClient({
  data,
  events,
}: {
  data: TriglyceridesHDLRatioDataPoint[];
  events: EventDataPoint[];
}) {
  // Filter events for medication events
  const medicationEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes("metofirm") ||
      e.title.toLowerCase().includes("ozempic")
  );

  // Combine data and events into a single dataset
  const chartData: ChartDataPoint[] = [
    // Add ratio data points
    ...data.map((point) => ({
      date: point.date.getTime(),
      ratio: point.triglyceridesHDLRatio,
      triglycerides: point.triglycerides,
      hdl: point.hdl,
    })),
    // Add event data points
    ...medicationEvents.map((event) => ({
      date: event.date.getTime(),
      eventValue: 1, // Fixed position for events on the chart
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
          domain={["auto", (dataMax: number) => Math.max(dataMax + 0.5, 5)]}
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
                    if (entry.dataKey === "ratio" && entry.value) {
                      const dataPoint = entry.payload as ChartDataPoint;
                      return (
                        <div key={index}>
                          <p style={{ color: entry.color }}>
                            Ratio: {(entry.value as number).toFixed(2)}
                          </p>
                          <p className="text-sm">
                            Triglycerides: {dataPoint.triglycerides?.toFixed(2)}{" "}
                            mg/dL
                          </p>
                          <p className="text-sm">
                            HDL: {dataPoint.hdl?.toFixed(2)} mg/dL
                          </p>
                        </div>
                      );
                    }
                    if (entry.dataKey === "eventValue" && entry.payload) {
                      const dataPoint = entry.payload as ChartDataPoint;
                      return (
                        <div key={index} style={{ color: entry.color }}>
                          <p className="font-semibold">
                            {dataPoint.eventTitle}
                          </p>
                          <p className="text-sm">
                            {dataPoint.eventDescription}
                          </p>
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
          stroke="green"
          strokeDasharray="5 5"
          label={{
            value: "Ideal (2.0)",
            position: "insideLeft",
            offset: 10,
          }}
        />
        <ReferenceLine
          y={4}
          stroke="red"
          strokeDasharray="5 5"
          label={{
            value: "High (4.0)",
            position: "insideLeft",
            offset: 10,
          }}
        />

        {/* Line chart for Ratio data */}
        <Line
          type="monotone"
          dataKey="ratio"
          name="Triglycerides/HDL Ratio"
          stroke="#8884d8"
          strokeWidth={2}
          dot={false}
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

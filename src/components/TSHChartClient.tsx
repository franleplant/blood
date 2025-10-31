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

interface TSHDataPoint {
  date: number;
  value: number;
}

interface EventDataPoint {
  date: Date;
  title: string;
  description: string;
}

interface ChartDataPoint {
  date: number;
  tsh?: number;
  eventValue?: number;
  eventTitle?: string;
  eventDescription?: string;
}

export default function TSHChartClient({
  data,
  events,
}: {
  data: TSHDataPoint[];
  events: EventDataPoint[];
}) {
  // Filter events for medication events
  const medicationEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes("metofirm") ||
      e.title.toLowerCase().includes("ozempic")
  );

  // Combine TSH data and events into a single dataset
  const chartData: ChartDataPoint[] = [
    // Add TSH data points
    ...data.map((point) => ({
      date: point.date,
      tsh: point.value,
    })),
    // Add event data points (positioned at a fixed TSH level for visibility)
    ...medicationEvents.map((event) => ({
      date: event.date.getTime(),
      eventValue: 0.5, // Fixed position for events on the chart
      eventTitle: event.title,
      eventDescription: event.description,
    })),
  ].sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-6">
      <div>
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
              tickFormatter={(unixTime) =>
                new Date(unixTime).toLocaleDateString()
              }
            />
            <YAxis domain={["dataMin", "dataMax + 0.5"]} />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number, name: string) => {
                if (name === "TSH") {
                  return [`${value} µUI/mL`, "TSH"];
                }
                return [value, name];
              }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-2 border rounded shadow">
                      <p className="font-semibold">
                        {new Date(label as number).toLocaleDateString()}
                      </p>
                      {payload.map((entry, index) => {
                        if (entry.dataKey === "tsh" && entry.value) {
                          return (
                            <p key={index} style={{ color: entry.color }}>
                              TSH: {entry.value} µUI/mL
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

            {/* Reference Lines for TSH Ranges */}
            <ReferenceLine
              y={0.4}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Normal Low (0.4)",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={4.0}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Normal High (4.0)",
                position: "insideLeft",
                offset: 10,
              }}
            />

            {/* Line chart for TSH data */}
            <Line
              type="monotone"
              dataKey="tsh"
              name="TSH (µUI/mL)"
              stroke="#8884d8"
              strokeWidth={2}
              activeDot={{ r: 6 }}
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
      </div>
    </div>
  );
}


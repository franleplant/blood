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

interface TestosteroneDataPoint {
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
  testosterone?: number;
  eventValue?: number;
  eventTitle?: string;
  eventDescription?: string;
}

export default function TotalTestosteroneChartClient({
  data,
  events,
  dateRange,
}: {
  data: TestosteroneDataPoint[];
  events: EventDataPoint[];
  dateRange?: { min: number; max: number };
}) {
  // Filter events for medication events
  const medicationEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes("metofirm") ||
      e.title.toLowerCase().includes("ozempic")
  );

  // Combine testosterone data and events into a single dataset
  const chartData: ChartDataPoint[] = [
    // Add testosterone data points
    ...data.map((point) => ({
      date: point.date,
      testosterone: point.value,
    })),
    // Add event data points (positioned at a fixed testosterone level for visibility)
    ...medicationEvents.map((event) => ({
      date: event.date.getTime(),
      eventValue: 2, // Fixed position for events on the chart
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
              domain={
                dateRange
                  ? [dateRange.min, dateRange.max]
                  : ["dataMin", "dataMax"]
              }
              tickFormatter={(unixTime) =>
                new Date(unixTime).toLocaleDateString()
              }
            />
            <YAxis domain={["dataMin", "dataMax + 1"]} />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number, name: string) => {
                if (name === "Testosterone") {
                  return [`${value} ng/mL`, "Testosterone"];
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
                        if (entry.dataKey === "testosterone" && entry.value) {
                          return (
                            <p key={index} style={{ color: entry.color }}>
                              Testosterone: {entry.value} ng/mL
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

            {/* Reference Lines for Testosterone Ranges */}
            <ReferenceLine
              y={2.8}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Low (2.8)",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={8.0}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Normal High (8.0)",
                position: "insideLeft",
                offset: 10,
              }}
            />

            {/* Line chart for testosterone data */}
            <Line
              type="monotone"
              dataKey="testosterone"
              name="Total Testosterone (ng/mL)"
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

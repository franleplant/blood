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

interface GlucoseDataPoint {
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
  glucose?: number;
  eventValue?: number;
  eventTitle?: string;
  eventDescription?: string;
}

export default function GlucoseChartClient({
  data,
  events,
}: {
  data: GlucoseDataPoint[];
  events: EventDataPoint[];
}) {
  // Filter events for medication events
  const medicationEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes("metofirm") ||
      e.title.toLowerCase().includes("ozempic")
  );

  // Combine glucose data and events into a single dataset
  const chartData: ChartDataPoint[] = [
    // Add glucose data points
    ...data.map((point) => ({
      date: point.date,
      glucose: point.value,
    })),
    // Add event data points (positioned at a fixed glucose level for visibility)
    ...medicationEvents.map((event) => ({
      date: event.date.getTime(),
      eventValue: 50, // Fixed position for events on the chart
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
            <YAxis domain={["dataMin", "dataMax + 10"]} />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number, name: string) => {
                if (name === "Glucose") {
                  return [`${value} mg/dL`, "Glucose"];
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
                        if (entry.dataKey === "glucose" && entry.value) {
                          return (
                            <p key={index} style={{ color: entry.color }}>
                              Glucose: {entry.value} mg/dL
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

            {/* Reference Lines for Glucose Ranges */}
            <ReferenceLine
              y={70}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Low (70)",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={100}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Normal (100)",
                position: "insideLeft",
                offset: 10,
              }}
            />

            {/* Line chart for glucose data */}
            <Line
              type="monotone"
              dataKey="glucose"
              name="Glucose (mg/dL)"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />

            {/* Scatter plot for events */}
            <Scatter
              dataKey="eventValue"
              name="Events"
              fill="#ff7300"
              shape="diamond"
              fontSize={10}
              // strokeWidth={10}
              // radius={20}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

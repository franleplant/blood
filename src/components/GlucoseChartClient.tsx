"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
  // Transform events data for scatter plot
  const scatterData = events.map((event, index) => ({
    x: event.date.getTime(),
    y: index + 1, // Simple y positioning for events
    title: event.title,
    description: event.description,
    date: event.date,
  }));

  // Find the date range from both datasets for synchronized axes
  const allDates = [
    ...data.map((d) => d.date),
    ...events.map((e) => e.date.getTime()),
  ];
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);

  return (
    <div className="space-y-6">
      {/* Glucose Line Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Glucose Levels</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={data}
            syncId="charts"
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
              domain={[minDate, maxDate]}
              tickFormatter={(unixTime) =>
                new Date(unixTime).toLocaleDateString()
              }
            />
            <YAxis
              domain={[
                "dataMin - 2",
                (dataMax: number) => Math.max(dataMax + 2, 102),
              ]}
            />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number) => [`${value} mg/dL`, "Glucose"]}
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
      </div>

      {/* Events Scatter Plot */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Events</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart
            data={scatterData}
            syncId="charts"
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              scale="time"
              domain={[minDate, maxDate]}
              tickFormatter={(unixTime) =>
                new Date(unixTime).toLocaleDateString()
              }
            />
            <YAxis
              type="number"
              domain={[0, Math.max(scatterData.length + 1, 3)]}
              hide
            />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number, name: string, props: any) => {
                if (name === "y") {
                  return [props.payload.title, "Event"];
                }
                return [value, name];
              }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                      <p className="font-semibold">
                        {new Date(label).toLocaleDateString()}
                      </p>
                      <p className="text-blue-600 font-medium">{data.title}</p>
                      <p className="text-gray-600 text-sm">
                        {data.description}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter dataKey="y" fill="#ff7300" shape="circle" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

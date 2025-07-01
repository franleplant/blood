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

interface HemoglobinA1cDataPoint {
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
  hba1c?: number;
  eventValue?: number;
  eventTitle?: string;
  eventDescription?: string;
}

export default function HemoglobinA1cChartClient({
  data,
  events,
}: {
  data: HemoglobinA1cDataPoint[];
  events: EventDataPoint[];
}) {
  const medicationEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes("metofirm") ||
      e.title.toLowerCase().includes("ozempic")
  );

  const chartData: ChartDataPoint[] = [
    ...data.map((point) => ({
      date: point.date,
      hba1c: point.value,
    })),
    ...medicationEvents.map((event) => ({
      date: event.date.getTime(),
      eventValue: 5,
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
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number, name: string) => {
                if (name === "HbA1c") {
                  return [`${value} %`, "HbA1c"];
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
                        if (entry.dataKey === "hba1c" && entry.value) {
                          return (
                            <p key={index} style={{ color: entry.color }}>
                              HbA1c: {entry.value} %
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
              y={5.7}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Standard 5.7%",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={5.4}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Optimal 5.4",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={5}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Optimal 5",
                position: "insideLeft",
                offset: 10,
              }}
            />

            <Line
              type="monotone"
              dataKey="hba1c"
              name="HbA1c (%)"
              stroke="#8884d8"
              strokeWidth={2}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />

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

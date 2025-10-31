"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface LiverEnzymeDataPoint {
  date: number;
  AST?: number;
  ALT?: number;
  GGT?: number;
}

export default function LiverEnzymesChartClient({
  data,
}: {
  data: LiverEnzymeDataPoint[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
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
              padding={{ left: 10, right: 10 }}
              dataKey="date"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(unixTime) =>
                new Date(unixTime).toLocaleDateString()
              }
            />
            <YAxis domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value: number, name: string) => {
                return [`${value} U/L`, name];
              }}
            />
            <Legend />

            {/* Reference Lines for Optimal Ranges */}
            <ReferenceLine
              y={17}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Optimal AST/ALT (17)",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={25}
              stroke="green"
              strokeDasharray="5 5"
              label={{
                value: "Optimal GGT (25)",
                position: "insideLeft",
                offset: 10,
              }}
            />

            {/* Reference Lines for Normal Ranges */}
            <ReferenceLine
              y={55}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Normal ALT (55)",
                position: "insideLeft",
                offset: 10,
              }}
            />
            <ReferenceLine
              y={48}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Normal AST (48)",
                position: "insideLeft",
                offset: 10,
                dy: -15,
              }}
            />
            <ReferenceLine
              y={61}
              stroke="orange"
              strokeDasharray="5 5"
              label={{
                value: "Normal GGT (61)",
                position: "insideLeft",
                offset: 10,
                dy: 15,
              }}
            />

            {/* Line chart for liver enzyme data */}
            <Line
              type="monotone"
              dataKey="AST"
              name="AST (U/L)"
              stroke="#8884d8"
              strokeWidth={2}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="ALT"
              name="ALT (U/L)"
              stroke="#82ca9d"
              strokeWidth={2}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="GGT"
              name="GGT (U/L)"
              stroke="#ffc658"
              strokeWidth={2}
              connectNulls={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

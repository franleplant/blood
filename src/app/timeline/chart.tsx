"use client";

import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { bisector } from "d3-array";
import { type CSSProperties, useMemo } from "react";
import { useTimeline } from "./context";

export type ChartPoint = { ms: number; value: number };

const bisectMs = bisector<ChartPoint, number>((p) => p.ms).left;

/**
 * Returns the data point nearest to `targetMs`, or null if `points` is empty.
 * O(log n) via d3-array bisector.
 */
function nearestPoint(
  points: ChartPoint[],
  targetMs: number,
): ChartPoint | null {
  if (points.length === 0) return null;
  const i = bisectMs(points, targetMs, 1);
  const before = points[i - 1] ?? null;
  const after = points[i] ?? null;
  if (!before) return after;
  if (!after) return before;
  return targetMs - before.ms < after.ms - targetMs ? before : after;
}

/**
 * One marker's chart, positioned along the shared timeline.
 *
 * Visual layers (back → front):
 *   1. Threshold zones (3 horizontal bands)
 *   2. Line path
 *   3. Dashed continuation past the last sample
 *   4. Data point dots
 *   5. Hover halo at the nearest-by-bisection point when the cursor is active
 *
 * The chart has no own concept of layout or width — it fills its parent and
 * reads x-positions from the timeline's xScale.
 */
export function TimelineMarkerChart({
  points,
  yDomain,
  color,
  zoneTop,
  zoneMid,
  zoneBottom,
  height = 80,
}: {
  points: ChartPoint[];
  yDomain: [number, number];
  color: string;
  zoneTop: string;
  zoneMid: string;
  zoneBottom: string;
  height?: number;
}) {
  const { xScale, width, hoveredMs, pinnedMs } = useTimeline();
  const cursorMs = hoveredMs ?? pinnedMs;

  const yScale = useMemo(
    () => scaleLinear({ domain: yDomain, range: [height - 6, 6] }),
    [yDomain, height],
  );

  const visiblePoints = useMemo(() => {
    if (width === 0) return [];
    const [domainStart, domainEnd] = xScale.domain().map((d) => +d);
    return points.filter((p) => p.ms >= domainStart && p.ms <= domainEnd);
  }, [points, xScale, width]);

  const nearest = useMemo(() => {
    if (cursorMs == null || visiblePoints.length === 0) return null;
    return nearestPoint(visiblePoints, cursorMs);
  }, [cursorMs, visiblePoints]);

  if (width === 0) {
    return <div className="absolute inset-0" />;
  }

  const last = visiblePoints[visiblePoints.length - 1];

  return (
    <div className="absolute inset-y-1 inset-x-0">
      {/* Threshold zones */}
      <div
        className="absolute inset-0 flex flex-col overflow-hidden rounded-[3px]"
        aria-hidden
      >
        <div className="h-[30%]" style={{ background: zoneTop }} />
        <div className="h-[40%]" style={{ background: zoneMid }} />
        <div className="h-[30%]" style={{ background: zoneBottom }} />
      </div>

      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <LinePath
          data={visiblePoints}
          x={(p) => xScale(p.ms)}
          y={(p) => yScale(p.value)}
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {last && xScale(last.ms) < width && (
          <line
            x1={xScale(last.ms)}
            y1={yScale(last.value)}
            x2={width}
            y2={yScale(last.value)}
            stroke={color}
            strokeOpacity={0.45}
            strokeDasharray="2.5 3"
            strokeWidth={1.4}
          />
        )}

        {visiblePoints.map((p, i) => (
          <circle
            key={i}
            cx={xScale(p.ms)}
            cy={yScale(p.value)}
            r={2.5}
            fill={color}
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}

        {nearest && (
          <g style={haloStyle}>
            <circle
              cx={xScale(nearest.ms)}
              cy={yScale(nearest.value)}
              r={6}
              fill={color}
              fillOpacity={0.18}
            />
            <circle
              cx={xScale(nearest.ms)}
              cy={yScale(nearest.value)}
              r={3.5}
              fill={color}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {nearest && (
        <ChartTooltip
          x={xScale(nearest.ms)}
          y={yScale(nearest.value)}
          value={nearest.value}
          ms={nearest.ms}
          color={color}
        />
      )}
    </div>
  );
}

const haloStyle: CSSProperties = {
  pointerEvents: "none",
};

function ChartTooltip({
  x,
  y,
  value,
  ms,
  color,
}: {
  x: number;
  y: number;
  value: number;
  ms: number;
  color: string;
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-sm"
      style={{
        left: x,
        top: y,
        transform: "translate(8px, -120%)",
        borderColor: `${color}66`,
      }}
    >
      <span className="tabular-nums">{formatValue(value)}</span>{" "}
      <span className="text-slate-400">
        {new Date(ms).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
          timeZone: "UTC",
        })}
      </span>
    </div>
  );
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

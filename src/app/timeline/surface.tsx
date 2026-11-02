"use client";

import { type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useTimeline } from "./context";

/**
 * Wraps the entire timeline area. Owns the mouse interactions that drive the
 * shared cursor:
 *   - mousemove anywhere inside → updates `hoveredMs` to the timestamp under x
 *   - mouseleave              → clears `hoveredMs`
 *   - click                  → pins/unpins `pinnedMs`
 *
 * Position-aware: only updates the cursor when the pointer is horizontally
 * within the chart column (computed from the measured element's bounding rect).
 *
 * Must be a child of <TimelineProvider>. Renders a `position: relative` div so
 * the overlay (gridlines + crosshair) can stretch absolutely over it.
 */
export function TimelineSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { msFromClientX, setHoveredMs, pinnedMs, setPinnedMs } = useTimeline();

  // Mouse and pen get a live crosshair. Touch skips move so a vertical
  // scroll isn't treated as a hover, and a tap pins the crosshair instead.
  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setHoveredMs(msFromClientX(e.clientX));
  };

  const handlePointerLeave = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setHoveredMs(null);
  };

  const handleClick = (e: MouseEvent) => {
    const ms = msFromClientX(e.clientX);
    if (ms == null) return;
    // Toggle pin: clicking near the pinned ms clears it; otherwise pins.
    if (pinnedMs != null && Math.abs(pinnedMs - ms) < 1000 * 60 * 60 * 24) {
      setPinnedMs(null);
    } else {
      setPinnedMs(ms);
    }
  };

  return (
    <div
      className={`relative touch-pan-y ${className ?? ""}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

/**
 * Visual layer rendered absolutely over the chart column inside a
 * <TimelineSurface>:
 *   - vertical gridline at every tick (full surface height)
 *   - crosshair line at `hoveredMs`
 *   - dashed line at `pinnedMs`
 *
 * pointer-events: none so it doesn't block events on chart points or icons.
 *
 * Position is derived from the chart column's measured `chartLeft` (offset
 * from the surface's left edge) and the timeline's measured `width`.
 */
export function TimelineOverlay({ ticks }: { ticks: number[] }) {
  const { xScale, width, chartLeft, hoveredMs, pinnedMs } = useTimeline();
  if (width === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-y-0"
      style={{ left: chartLeft, width, height: "100%" }}
      aria-hidden
    >
      {ticks.map((ms) => {
        const x = xScale(ms);
        if (x < 0 || x > width) return null;
        return (
          <line
            key={ms}
            x1={x}
            x2={x}
            y1={0}
            y2="100%"
            stroke="#94a3b8"
            strokeOpacity={0.35}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        );
      })}

      {hoveredMs != null &&
        (() => {
          const x = xScale(hoveredMs);
          if (x < 0 || x > width) return null;
          return (
            <line
              x1={x}
              x2={x}
              y1={0}
              y2="100%"
              stroke="#0f172a"
              strokeOpacity={0.45}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          );
        })()}

      {pinnedMs != null &&
        (() => {
          const x = xScale(pinnedMs);
          if (x < 0 || x > width) return null;
          return (
            <line
              x1={x}
              x2={x}
              y1={0}
              y2="100%"
              stroke="#2563eb"
              strokeOpacity={0.7}
              strokeWidth={1}
              strokeDasharray="3 3"
              shapeRendering="crispEdges"
            />
          );
        })()}
    </svg>
  );
}

"use client";

import { scaleTime } from "@visx/scale";
import type { ScaleTime } from "d3-scale";
import {
  createContext,
  type RefCallback,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type TimelineDomain = { start: number; end: number };

/**
 * Read-side handle to the timeline. Anything that needs to position content
 * along the time axis — a chart line, an event icon, the crosshair, the
 * gridlines — reads its pixel x from `xScale(ms)`.
 *
 * Cross-chart cursor sync is a consequence of every consumer reading the same
 * `hoveredMs` from this context.
 */
export interface TimelineEngine {
  /** Time window currently rendered (ms since epoch). Driven by the range tabs. */
  domain: TimelineDomain;

  /** Pixel width of the chart column. 0 until the first ResizeObserver tick. */
  width: number;

  /** Left edge of the chart column, relative to the timeline surface. */
  chartLeft: number;

  /** ms → px in [0, width]. */
  xScale: ScaleTime<number, number>;

  /** Timestamp under the cursor (ms), or null when the cursor is outside the column. */
  hoveredMs: number | null;
  setHoveredMs: (ms: number | null) => void;

  /** Timestamp pinned by a click. Persists until cleared or another click lands. */
  pinnedMs: number | null;
  setPinnedMs: (ms: number | null) => void;

  /**
   * Attach to one element that fills the chart column horizontally — the source
   * of truth for both the column's width (via ResizeObserver) and screen-x →
   * timestamp conversion (via getBoundingClientRect at hover time).
   */
  measureRef: RefCallback<HTMLElement>;

  /**
   * Translate a screen-space clientX into a timestamp, or null if it's outside
   * the chart column. Uses the measured element's current bounding rect.
   */
  msFromClientX: (clientX: number) => number | null;
}

const TimelineContext = createContext<TimelineEngine | null>(null);

export function useTimeline(): TimelineEngine {
  const v = useContext(TimelineContext);
  if (!v)
    throw new Error("useTimeline must be used within a <TimelineProvider>");
  return v;
}

export function TimelineProvider({
  domain,
  children,
}: {
  domain: TimelineDomain;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const [chartLeft, setChartLeft] = useState(0);
  const [hoveredMs, setHoveredMs] = useState<number | null>(null);
  const [pinnedMs, setPinnedMs] = useState<number | null>(null);

  const measuredEl = useRef<HTMLElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const measureRef = useCallback<RefCallback<HTMLElement>>((el) => {
    if (observer.current) {
      observer.current.disconnect();
      observer.current = null;
    }
    measuredEl.current = el;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.max(0, Math.round(w)));
      const parent = el.offsetParent instanceof HTMLElement ? el.offsetParent : null;
      const left = parent
        ? el.getBoundingClientRect().left - parent.getBoundingClientRect().left
        : el.offsetLeft;
      setChartLeft(Math.max(0, Math.round(left)));
    });
    ro.observe(el);
    observer.current = ro;
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [new Date(domain.start), new Date(domain.end)],
        range: [0, Math.max(1, width)],
      }),
    [domain.start, domain.end, width],
  );

  const msFromClientX = useCallback(
    (clientX: number): number | null => {
      const el = measuredEl.current;
      if (!el || width === 0) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      if (x < 0 || x > rect.width) return null;
      const date = xScale.invert(x);
      return +date;
    },
    [xScale, width],
  );

  const value = useMemo<TimelineEngine>(
    () => ({
      domain,
      width,
      chartLeft,
      xScale,
      hoveredMs,
      setHoveredMs,
      pinnedMs,
      setPinnedMs,
      measureRef,
      msFromClientX,
    }),
    [domain, width, chartLeft, xScale, hoveredMs, pinnedMs, measureRef, msFromClientX],
  );

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

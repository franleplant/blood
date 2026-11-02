"use client";

import {
  Activity,
  Atom,
  Ban,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  Droplet,
  Dumbbell,
  Filter,
  FlaskConical,
  Heart,
  LayoutGrid,
  Leaf,
  MoreHorizontal,
  Moon,
  Network,
  Pill,
  SlidersHorizontal,
  Sparkles,
  Star,
  TestTube,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  buildMonthTicks,
  CATEGORY_META,
  CATEGORY_ORDER,
  type Cluster,
  type DashboardData,
  DEFAULT_HIDDEN_CATEGORIES,
  type DenseRegion,
  daysBetween,
  type EventCategory,
  type EventItem,
  formatDateShort,
  formatDateTiny,
  type Marker,
  MARKER_CATEGORIES,
  type MarkerCategory,
  MARKER_CATEGORY_LABELS,
  MARKER_CATEGORY_ORDER,
  parseEventTitle,
  type SidebarCounts,
} from "./dashboard-data";
import { TimelineMarkerChart } from "./timeline/chart";
import { TimelineProvider, useTimeline } from "./timeline/context";
import { TimelineOverlay, TimelineSurface } from "./timeline/surface";

const TIME_RANGES = ["1M", "3M", "6M", "1Y", "2Y", "ALL"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const ROW_HEIGHT = 80;

type HoveredEvent = {
  eventKey: string;
  pairId?: string;
} | null;

type OpenCluster = { clusterId: string } | null;

export default function Dashboard({ data }: { data: DashboardData }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeRange, setActiveRange] = useState<TimeRange>("2Y");
  const [compareOn, setCompareOn] = useState(false);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<HoveredEvent>(null);
  const [openCluster, setOpenCluster] = useState<OpenCluster>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const allEvents = useMemo(
    () => [...data.events, ...data.clusters.flatMap((c) => c.events)],
    [data.events, data.clusters],
  );

  const eventsByPair = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of allEvents) {
      if (!e.pairId) continue;
      const arr = m.get(e.pairId) ?? [];
      arr.push(e);
      m.set(e.pairId, arr);
    }
    return m;
  }, [allEvents]);

  const clusterByEventKey = useMemo(() => {
    const m = new Map<string, Cluster>();
    for (const c of data.clusters)
      for (const e of c.events) m.set(e.key, c);
    return m;
  }, [data.clusters]);

  const activePairId = hoveredEvent?.pairId ?? null;
  const activePair = activePairId
    ? eventsByPair.get(activePairId) ?? null
    : null;

  // Compute visible time window from active range vs full timeline
  const visibleRange = useMemo(() => {
    const end = data.timelineEnd;
    const start = (() => {
      switch (activeRange) {
        case "1M":
          return end - 31 * 86400000;
        case "3M":
          return end - 92 * 86400000;
        case "6M":
          return end - 184 * 86400000;
        case "1Y":
          return end - 366 * 86400000;
        case "2Y":
          return end - 731 * 86400000;
        case "ALL":
          return data.timelineStart;
      }
    })();
    return {
      start: Math.max(start, data.timelineStart),
      end,
    };
  }, [activeRange, data.timelineStart, data.timelineEnd]);

  const monthTicks = useMemo(() => {
    const all = buildMonthTicks(visibleRange.start, visibleRange.end);
    const months = Math.max(
      1,
      Math.round((visibleRange.end - visibleRange.start) / (30 * 86400000)),
    );
    let step = 1;
    if (months > 60) step = 12;
    else if (months > 30) step = 6;
    else if (months > 14) step = 3;
    return all.filter((_, i) => i % step === 0);
  }, [visibleRange]);

  const filteredMarkers = useMemo(() => {
    const all = data.markers;
    const defaultVisible = all.filter(
      (m) =>
        !DEFAULT_HIDDEN_CATEGORIES.includes(
          MARKER_CATEGORIES[m.id] ?? "metabolic",
        ),
    );
    switch (activeFilter) {
      case "all":
        return defaultVisible;
      case "out-of-range":
        return defaultVisible.filter(
          (m) =>
            m.status === "Borderline" ||
            m.status === "High" ||
            m.status === "Low",
        );
      case "derived":
        return defaultVisible.filter((m) => m.derived);
      case "raw":
        return defaultVisible.filter((m) => !m.derived);
      case "improving": {
        const ids = new Set(data.trendIds.improving);
        return defaultVisible.filter((m) => ids.has(m.id));
      }
      case "worsening": {
        const ids = new Set(data.trendIds.worsening);
        return defaultVisible.filter((m) => ids.has(m.id));
      }
      case "most-changed": {
        const ids = new Set(data.trendIds.mostChanged);
        return defaultVisible.filter((m) => ids.has(m.id));
      }
    }
    if ((MARKER_CATEGORY_ORDER as string[]).includes(activeFilter)) {
      // Category clicks bypass the default-hidden filter so users can still
      // reach "Blood Count" etc. from the sidebar.
      return all.filter(
        (m) => MARKER_CATEGORIES[m.id] === (activeFilter as MarkerCategory),
      );
    }
    return defaultVisible;
  }, [activeFilter, data.markers, data.trendIds]);

  const dataForView = useMemo(
    () => ({ ...data, markers: filteredMarkers }),
    [data, filteredMarkers],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-w-0 flex-col gap-2 px-2 py-2 lg:flex-row lg:gap-5 lg:p-0">
        <MobileFilterBar
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          counts={data.sidebarCounts}
          categoryCounts={data.markerCategoryCounts}
        />
        {sidebarOpen && (
          <Sidebar
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            counts={data.sidebarCounts}
            categoryCounts={data.markerCategoryCounts}
            onHide={() => setSidebarOpen(false)}
          />
        )}
        <div className="min-w-0 flex-1">
          <MainPanel
              data={dataForView}
              visibleRange={visibleRange}
              monthTicks={monthTicks}
              sidebarOpen={sidebarOpen}
              onShowSidebar={() => setSidebarOpen(true)}
              activeRange={activeRange}
              setActiveRange={setActiveRange}
              compareOn={compareOn}
              setCompareOn={setCompareOn}
              hoveredCluster={hoveredCluster}
              setHoveredCluster={setHoveredCluster}
              hoveredEvent={hoveredEvent}
              setHoveredEvent={setHoveredEvent}
              openCluster={openCluster}
              setOpenCluster={setOpenCluster}
              clusterByEventKey={clusterByEventKey}
              activePair={activePair}
            />
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Filters -------------------------- */

type QuickFilter = {
  id: string;
  label: string;
  count: number;
  Icon: typeof Star;
  iconBg: string;
  iconColor: string;
};

function quickFilters(counts: SidebarCounts): Array<QuickFilter> {
  return [
    {
      id: "all",
      label: "Overview",
      count: counts.all,
      Icon: LayoutGrid,
      iconBg: "#dbeafe",
      iconColor: "#2563eb",
    },
    {
      id: "out-of-range",
      label: "Out of Range",
      count: counts.outOfRange,
      Icon: TriangleAlert,
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
    },
    {
      id: "improving",
      label: "Improving",
      count: counts.improving,
      Icon: TrendingUp,
      iconBg: "#dcfce7",
      iconColor: "#16a34a",
    },
    {
      id: "worsening",
      label: "Worsening",
      count: counts.worsening,
      Icon: TrendingDown,
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
    },
    {
      id: "most-changed",
      label: "Most Changed",
      count: counts.mostChanged,
      Icon: Zap,
      iconBg: "#fef3c7",
      iconColor: "#ca8a04",
    },
    {
      id: "derived",
      label: "Derived Markers",
      count: counts.derived,
      Icon: Network,
      iconBg: "#ede9fe",
      iconColor: "#7c3aed",
    },
    {
      id: "raw",
      label: "Raw Markers",
      count: counts.raw,
      Icon: FlaskConical,
      iconBg: "#e0e7ff",
      iconColor: "#4f46e5",
    },
  ];
}

const CATEGORY_ICONS: Record<MarkerCategory, typeof Activity> = {
  metabolic: Activity,
  "blood-sugar": Droplet,
  lipids: CircleDot,
  liver: TestTube,
  kidney: Filter,
  blood: Heart,
  nutrients: Leaf,
  hormones: Sparkles,
};

function categoryFilters(categoryCounts: Record<MarkerCategory, number>) {
  return MARKER_CATEGORY_ORDER.map((id) => ({
    id,
    label: MARKER_CATEGORY_LABELS[id],
    count: categoryCounts[id] ?? 0,
    Icon: CATEGORY_ICONS[id],
  })).filter((c) => c.count > 0);
}

function MobileFilterBar({
  activeFilter,
  setActiveFilter,
  counts,
  categoryCounts,
}: {
  activeFilter: string;
  setActiveFilter: (id: string) => void;
  counts: SidebarCounts;
  categoryCounts: Record<MarkerCategory, number>;
}) {
  const quick = quickFilters(counts);
  const categories = categoryFilters(categoryCounts);
  const chips = [
    ...quick.map((f) => ({ id: f.id, label: f.label, count: f.count })),
    ...categories.map((c) => ({ id: c.id, label: c.label, count: c.count })),
  ];

  return (
    <div className="min-w-0 lg:hidden">
      <div className="mb-1.5 px-0.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
        FILTERS
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map(({ id, label, count }, index) => {
          const selected = id === activeFilter;
          const divider = index === quick.length;
          return (
            <span key={id} className="contents">
              {divider && (
                <span className="mx-0.5 w-px shrink-0 self-stretch bg-slate-200" />
              )}
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveFilter(id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                  selected
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {label}
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    selected ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------- Sidebar -------------------------- */

function Sidebar({
  activeFilter,
  setActiveFilter,
  counts,
  categoryCounts,
  onHide,
}: {
  activeFilter: string;
  setActiveFilter: (id: string) => void;
  counts: SidebarCounts;
  categoryCounts: Record<MarkerCategory, number>;
  onHide: () => void;
}) {
  const filters = quickFilters(counts);
  const categories = categoryFilters(categoryCounts);

  return (
    <aside className="hidden w-[244px] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-semibold text-slate-900">Filters</div>
        <button
          onClick={onHide}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Hide <ChevronLeft className="size-3.5" />
        </button>
      </div>

      <div className="mb-2 px-1 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
        QUICK FILTERS
      </div>
      <ul className="flex flex-col gap-0.5">
        {filters.map(
          ({ id, label, count, Icon, iconBg, iconColor }) => {
            const selected = id === activeFilter;
            return (
              <li key={id}>
                <button
                  onClick={() => setActiveFilter(id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-md"
                    style={{
                      background: selected ? "#dbeafe" : iconBg,
                      color: selected ? "#2563eb" : iconColor,
                    }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1 text-left font-medium">{label}</span>
                  <span
                    className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                      selected
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          },
        )}
      </ul>

      <div className="mt-5 mb-2 flex items-center justify-between px-1">
        <div className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
          CATEGORIES
        </div>
        <ChevronDown className="size-3.5 text-slate-400" />
      </div>
      <ul className="flex flex-col gap-0.5">
        {categories.map(({ id, label, count, Icon }) => {
          const selected = id === activeFilter;
          return (
            <li key={id}>
              <button
                onClick={() => setActiveFilter(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition ${
                  selected
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-md ${
                    selected
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-left font-medium">{label}</span>
                <span
                  className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                    selected
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/* -------------------------- Main panel -------------------------- */

function MainPanel({
  data,
  visibleRange,
  monthTicks,
  sidebarOpen,
  onShowSidebar,
  activeRange,
  setActiveRange,
  compareOn,
  setCompareOn,
  hoveredCluster,
  setHoveredCluster,
  hoveredEvent,
  setHoveredEvent,
  openCluster,
  setOpenCluster,
  clusterByEventKey,
  activePair,
}: {
  data: DashboardData;
  visibleRange: { start: number; end: number };
  monthTicks: { label: string; ms: number }[];
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  activeRange: TimeRange;
  setActiveRange: (r: TimeRange) => void;
  compareOn: boolean;
  setCompareOn: (b: boolean) => void;
  hoveredCluster: string | null;
  setHoveredCluster: (id: string | null) => void;
  hoveredEvent: HoveredEvent;
  setHoveredEvent: (e: HoveredEvent) => void;
  openCluster: OpenCluster;
  setOpenCluster: (o: OpenCluster) => void;
  clusterByEventKey: Map<string, Cluster>;
  activePair: EventItem[] | null;
}) {
  const visibleCategories = data.categoriesPresent.length
    ? data.categoriesPresent
    : (["medications", "lifestyle", "nutrition", "sleep"] as EventCategory[]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Header
        sidebarOpen={sidebarOpen}
        onShowSidebar={onShowSidebar}
        activeRange={activeRange}
        setActiveRange={setActiveRange}
        compareOn={compareOn}
        setCompareOn={setCompareOn}
        markerCount={data.sidebarCounts.all}
      />
      <Timeline
        data={data}
        visibleRange={visibleRange}
        monthTicks={monthTicks}
        visibleCategories={visibleCategories}
        hoveredCluster={hoveredCluster}
        setHoveredCluster={setHoveredCluster}
        hoveredEvent={hoveredEvent}
        setHoveredEvent={setHoveredEvent}
        openCluster={openCluster}
        setOpenCluster={setOpenCluster}
        clusterByEventKey={clusterByEventKey}
        activePair={activePair}
      />
    </section>
  );
}

function Header({
  sidebarOpen,
  onShowSidebar,
  activeRange,
  setActiveRange,
  compareOn,
  setCompareOn,
  markerCount,
}: {
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  activeRange: TimeRange;
  setActiveRange: (r: TimeRange) => void;
  compareOn: boolean;
  setCompareOn: (b: boolean) => void;
  markerCount: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-slate-200 px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:overflow-x-clip lg:px-5">
      <div className="hidden items-center gap-3 lg:flex">
        {!sidebarOpen && (
          <button
            onClick={onShowSidebar}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            title="Show filters"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        )}
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <span className="flex size-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <span className="text-[11px] font-bold">A↗</span>
          </span>
          Overview
          <span className="min-w-5 rounded-md bg-slate-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-slate-600">
            {markerCount}
          </span>
          <ChevronDown className="size-3.5 text-slate-400" />
        </button>
      </div>

      <div className="flex w-full items-stretch gap-1 overflow-x-auto rounded-lg bg-slate-100 p-0.5 lg:w-auto lg:shrink-0 lg:items-center lg:overflow-visible">
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={activeRange === r}
            onClick={() => setActiveRange(r)}
            className={`min-h-11 flex-1 rounded-md px-2 text-xs font-semibold transition lg:min-h-0 lg:flex-none lg:px-3 lg:py-1 ${
              activeRange === r
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={compareOn}
          onClick={() => setCompareOn(!compareOn)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:min-h-0 lg:w-auto"
        >
          <SlidersHorizontal className="size-3.5" />
          Compare
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition ${
              compareOn ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block size-3 rounded-full bg-white transition ${
                compareOn ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
        <button className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:flex">
          <SlidersHorizontal className="size-3.5" />
          View Options
        </button>
        <button className="hidden rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 lg:inline-flex">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------- Timeline -------------------------- */

function Timeline(props: {
  data: DashboardData;
  visibleRange: { start: number; end: number };
  monthTicks: { label: string; ms: number }[];
  visibleCategories: EventCategory[];
  hoveredCluster: string | null;
  setHoveredCluster: (id: string | null) => void;
  hoveredEvent: HoveredEvent;
  setHoveredEvent: (e: HoveredEvent) => void;
  openCluster: OpenCluster;
  setOpenCluster: (o: OpenCluster) => void;
  clusterByEventKey: Map<string, Cluster>;
  activePair: EventItem[] | null;
}) {
  return (
    <div className="px-3 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4">
      <TimelineProvider domain={props.visibleRange}>
        <TimelineSurface>
          <TimelineBody {...props} />
        </TimelineSurface>
      </TimelineProvider>
    </div>
  );
}

function TimelineBody({
  data,
  visibleRange,
  monthTicks,
  visibleCategories,
  hoveredCluster,
  setHoveredCluster,
  hoveredEvent,
  setHoveredEvent,
  openCluster,
  setOpenCluster,
  clusterByEventKey,
  activePair,
}: {
  data: DashboardData;
  visibleRange: { start: number; end: number };
  monthTicks: { label: string; ms: number }[];
  visibleCategories: EventCategory[];
  hoveredCluster: string | null;
  setHoveredCluster: (id: string | null) => void;
  hoveredEvent: HoveredEvent;
  setHoveredEvent: (e: HoveredEvent) => void;
  openCluster: OpenCluster;
  setOpenCluster: (o: OpenCluster) => void;
  clusterByEventKey: Map<string, Cluster>;
  activePair: EventItem[] | null;
}) {
  const tl = useTimeline();
  const axisTicks = useMemo(() => {
    if (tl.width === 0 || tl.width >= 640) return monthTicks;
    const maxLabels = Math.max(2, Math.floor(tl.width / 72));
    const stride = Math.max(1, Math.ceil(monthTicks.length / maxLabels));
    if (stride <= 1) return monthTicks;
    return monthTicks.filter((_, i) => i % stride === 0);
  }, [monthTicks, tl.width]);
  const visibleDenseRegions = data.denseRegions.filter(
    (r) => r.end >= visibleRange.start && r.start <= visibleRange.end,
  );
  const latestSubtitle = data.latestSampleMs
    ? formatDateShort(data.latestSampleMs)
    : "—";

  const categoriesOrdered = CATEGORY_ORDER.filter((c) =>
    visibleCategories.includes(c),
  );

  return (
    <>
      <div className="dash-grid items-end pb-2">
        <div className="hidden text-[10px] font-semibold tracking-[0.16em] text-slate-400 lg:block">
          MARKER
        </div>
        <div className="hidden text-[10px] font-semibold tracking-[0.16em] text-slate-400 lg:block">
          RANGE
        </div>
        <div ref={tl.measureRef} className="relative h-5 min-w-0">
          {tl.width > 0 &&
            axisTicks.map((t) => {
              const x = tl.xScale(t.ms);
              if (x < 0 || x > tl.width) return null;
              const edge = tl.width < 640;
              const transform = !edge
                ? "translateX(-50%)"
                : x < 32
                  ? "translateX(0)"
                  : x > tl.width - 32
                    ? "translateX(-100%)"
                    : "translateX(-50%)";
              return (
                <div
                  key={t.ms}
                  className="absolute whitespace-nowrap text-[11px] font-medium text-slate-500"
                  style={{ left: x, transform }}
                >
                  {t.label}
                </div>
              );
            })}
        </div>
        <div className="hidden pl-3 lg:block">
          <div className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
            LATEST
          </div>
          <div className="text-[10px] text-slate-400">{latestSubtitle}</div>
        </div>
      </div>

      <div className="flex flex-col">
        {data.markers.map((marker, i) => (
          <MarkerRow
            key={marker.id}
            marker={marker}
            denseRegions={visibleDenseRegions}
            isLast={i === data.markers.length - 1}
          />
        ))}
      </div>

      <div className="mt-4 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
        EVENTS
      </div>

      <div className="mt-2 flex flex-col">
        {categoriesOrdered.map((cat) => (
          <EventLane
            key={cat}
            category={cat}
            denseRegions={visibleDenseRegions}
            looseEvents={data.events.filter((e) => e.category === cat)}
            clusters={data.clusters.filter((c) => c.category === cat)}
            hoveredCluster={hoveredCluster}
            setHoveredCluster={setHoveredCluster}
            hoveredEvent={hoveredEvent}
            setHoveredEvent={setHoveredEvent}
            openCluster={openCluster}
            setOpenCluster={setOpenCluster}
            clusterByEventKey={clusterByEventKey}
            activePair={activePair}
          />
        ))}
      </div>

      {data.clusters.length > 0 && (
        <div className="dash-grid mt-8 items-center">
          <div className="hidden lg:block" />
          <div className="hidden lg:block" />
          <div className="flex items-center justify-start gap-2 text-[11px] text-slate-500 lg:justify-end lg:pr-2">
            <span>Event density</span>
            <span>Low</span>
            <span className="block h-1.5 w-28 shrink-0 rounded-full bg-gradient-to-r from-violet-100 via-violet-300 to-violet-500" />
            <span>High</span>
          </div>
          <div className="hidden lg:block" />
        </div>
      )}

      <TimelineOverlay ticks={axisTicks.map((t) => t.ms)} />
    </>
  );
}

/* -------------------------- Marker row -------------------------- */

function MarkerRow({
  marker,
  denseRegions,
  isLast,
}: {
  marker: Marker;
  denseRegions: DenseRegion[];
  isLast: boolean;
}) {
  const { xScale, width } = useTimeline();
  const optimalRows = marker.rangeRows.filter((row) => row.tone === "optimal");
  return (
    <div className="dash-grid items-stretch max-lg:mb-3">
      <div className="flex items-start justify-between gap-3 py-2.5 lg:contents">
        <div className="flex min-w-0 flex-col justify-center lg:h-20 lg:py-0 lg:pr-3">
          <div className="text-sm font-semibold leading-tight text-slate-900">
            {marker.name}
          </div>
          <div className="text-[11px] text-slate-500">
            {marker.derived ? "(derived)" : marker.unit}
          </div>
          {optimalRows.length > 0 && (
            <div className="mt-0.5 text-[11px] font-medium text-emerald-600 lg:hidden">
              {optimalRows.map((row) => (
                <div key={row.text}>Optimal {row.text}</div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5 lg:hidden">
          <div className="text-[20px] font-semibold leading-none tabular-nums text-slate-900">
            {formatLatest(marker.latest)}
          </div>
          <div
            className={`text-[12px] font-medium ${statusColor(marker.status)}`}
          >
            {marker.status}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:h-20 lg:items-center">
        <RangeCell marker={marker} />
      </div>

      <div className="relative h-20 min-w-0">
        {width > 0 &&
          denseRegions.map((r, i) => {
            const left = xScale(r.start);
            const right = xScale(r.end);
            return (
              <div
                key={i}
                className="absolute inset-y-1 rounded-md"
                style={{
                  left,
                  width: right - left,
                  background:
                    "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(139,92,246,0.06))",
                }}
              />
            );
          })}
        <span className="pointer-events-none absolute left-0.5 top-0.5 z-[1] rounded bg-white/80 px-1 text-[11px] font-medium tabular-nums leading-none text-slate-500 lg:hidden">
          {formatAxis(marker.yMax)}
        </span>
        <span className="pointer-events-none absolute bottom-0.5 left-0.5 z-[1] rounded bg-white/80 px-1 text-[11px] font-medium tabular-nums leading-none text-slate-500 lg:hidden">
          {formatAxis(marker.yMin)}
        </span>
        <TimelineMarkerChart
          points={marker.data}
          yDomain={[marker.yMin, marker.yMax]}
          color={marker.color}
          zoneTop={marker.zoneTop}
          zoneMid={marker.zoneMid}
          zoneBottom={marker.zoneBottom}
          height={ROW_HEIGHT}
        />
        {!isLast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-slate-100" />
        )}
      </div>

      <div className="hidden h-20 flex-col items-end justify-center gap-0.5 pl-3 lg:flex">
        <div className="flex items-center gap-2">
          <div className="text-[20px] font-semibold leading-none text-slate-900">
            {formatLatest(marker.latest)}
          </div>
          <Sparkline marker={marker} />
        </div>
        <div
          className={`text-[12px] font-medium ${statusColor(marker.status)}`}
        >
          {marker.status}
        </div>
      </div>
    </div>
  );
}

function RangeCell({ marker }: { marker: Marker }) {
  return (
    <div className="flex flex-col justify-center gap-0.5 pr-3 text-[11.5px] leading-tight">
      {marker.rangeRows.map((row, i) => (
        <div
          key={i}
          className={`grid grid-cols-[60px_1fr] items-center font-medium ${rangeToneClass(row.tone)}`}
        >
          <span>{row.label}</span>
          <span className="tabular-nums">{row.text}</span>
        </div>
      ))}
    </div>
  );
}

function rangeToneClass(tone: "high" | "borderline" | "optimal" | "low"): string {
  switch (tone) {
    case "high":
      return "text-rose-600";
    case "borderline":
      return "text-amber-600";
    case "optimal":
      return "text-emerald-600";
    case "low":
      return "text-sky-500";
  }
}

function formatLatest(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function formatAxis(v: number): string {
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v
    .toFixed(digits)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function statusColor(status: string): string {
  switch (status) {
    case "Optimal":
    case "Good":
      return "text-emerald-600";
    case "Borderline":
      return "text-amber-600";
    case "High":
    case "Low":
      return "text-rose-600";
    default:
      return "text-slate-500";
  }
}

function Sparkline({ marker }: { marker: Marker }) {
  const points = marker.data.slice(-8);
  if (points.length < 2) return null;
  const W = 60;
  const H = 18;
  const minV = Math.min(...points.map((p) => p.value));
  const maxV = Math.max(...points.map((p) => p.value));
  const span = Math.max(1e-6, maxV - minV);
  const x = (i: number) => (i / (points.length - 1)) * (W - 4) + 2;
  const y = (v: number) => H - 2 - ((v - minV) / span) * (H - 4);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  return (
    <svg width={W} height={H} className="opacity-80">
      <path
        d={d}
        fill="none"
        stroke={marker.color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------- Event lane -------------------------- */

function categoryIcon(cat: EventCategory) {
  switch (cat) {
    case "medications":
      return Pill;
    case "supplements":
      return Pill;
    case "lifestyle":
      return Atom;
    case "nutrition":
      return Leaf;
    case "sleep":
      return Moon;
    case "training":
      return Dumbbell;
  }
}

function EventLane({
  category,
  denseRegions,
  looseEvents,
  clusters,
  hoveredCluster,
  setHoveredCluster,
  hoveredEvent,
  setHoveredEvent,
  openCluster,
  setOpenCluster,
  clusterByEventKey,
  activePair,
}: {
  category: EventCategory;
  denseRegions: DenseRegion[];
  looseEvents: EventItem[];
  clusters: Cluster[];
  hoveredCluster: string | null;
  setHoveredCluster: (id: string | null) => void;
  hoveredEvent: HoveredEvent;
  setHoveredEvent: (e: HoveredEvent) => void;
  openCluster: OpenCluster;
  setOpenCluster: (o: OpenCluster) => void;
  clusterByEventKey: Map<string, Cluster>;
  activePair: EventItem[] | null;
}) {
  const { xScale, width, domain } = useTimeline();
  const meta = CATEGORY_META[category];
  const LaneIcon = categoryIcon(category);

  const visibleInRange = looseEvents.filter(
    (e) => e.date >= domain.start && e.date <= domain.end,
  );
  const visibleClusters = clusters.filter(
    (c) => c.date >= domain.start && c.date <= domain.end,
  );

  // For short pairs (e.g., 8-day course on a 2Y view) the start and stop
  // icons would be drawn on top of each other. Drop the stop icon — the
  // dashed connector underneath still encodes the duration and the start
  // icon's tooltip carries the full date range.
  const ICON_OVERLAP_PX = 26;
  const startByPair = new Map<string, EventItem>();
  for (const e of visibleInRange) {
    if (e.pairKind === "start" && e.pairId) startByPair.set(e.pairId, e);
  }
  const visibleLooseEvents =
    width === 0
      ? visibleInRange
      : visibleInRange.filter((e) => {
          if (e.pairKind !== "stop" || !e.pairId) return true;
          const start = startByPair.get(e.pairId);
          if (!start) return true;
          return (
            Math.abs(xScale(e.date) - xScale(start.date)) >= ICON_OVERLAP_PX
          );
        });

  // Pixel-based visual clustering: when icons fall too close at the current
  // zoom to be told apart, collapse them into a +N pill. Naturally zoom-
  // aware — zooming in widens the gaps and the cluster dissolves into
  // individual icons. Operates only on loose events; data-level clusters
  // are rendered separately below.
  const ICON_CLUSTER_PX = 52;
  const sortedVisible = [...visibleLooseEvents].sort(
    (a, b) => a.date - b.date,
  );
  type LaneItem =
    | { kind: "single"; event: EventItem; x: number }
    | {
        kind: "visual-cluster";
        id: string;
        events: EventItem[];
        date: number;
        x: number;
      };
  const laneItems: LaneItem[] = [];
  if (width === 0) {
    for (const ev of sortedVisible) {
      laneItems.push({ kind: "single", event: ev, x: 0 });
    }
  } else {
    let i = 0;
    while (i < sortedVisible.length) {
      let j = i;
      while (
        j + 1 < sortedVisible.length &&
        xScale(sortedVisible[j + 1].date) - xScale(sortedVisible[j].date) <
          ICON_CLUSTER_PX
      ) {
        j++;
      }
      if (j > i) {
        const events = sortedVisible.slice(i, j + 1);
        const date =
          events.reduce((acc, e) => acc + e.date, 0) / events.length;
        laneItems.push({
          kind: "visual-cluster",
          id: `visual-${category}-${events[0].key}`,
          events,
          date,
          x: xScale(date),
        });
      } else {
        const ev = sortedVisible[i];
        laneItems.push({
          kind: "single",
          event: ev,
          x: xScale(ev.date),
        });
      }
      i = j + 1;
    }
  }

  // Labels render to the right of their icon. Hide a single's label when
  // the next lane item is too close to fit "Started <Subject>" between
  // them.
  const MIN_LABEL_GAP_PX = 110;
  const labelHidden = new Set<string>();
  for (let i = 0; i < laneItems.length; i++) {
    const item = laneItems[i];
    if (item.kind !== "single") continue;
    if (item.event.hideLabel) {
      labelHidden.add(item.event.key);
      continue;
    }
    if (width === 0) continue;
    const next = laneItems[i + 1];
    if (next != null && next.x - item.x < MIN_LABEL_GAP_PX) {
      labelHidden.add(item.event.key);
    }
  }

  // Pair shading + connector for active pair on this lane
  const pairInLane = activePair?.filter((e) => e.category === category) ?? [];
  const pairStart = pairInLane.find((e) => e.pairKind === "start");
  const pairStop = pairInLane.find((e) => e.pairKind === "stop");
  const stopInClusterId = pairStop
    ? clusterByEventKey.get(pairStop.key)?.id
    : null;

  // When a tooltip/panel is showing inside this lane, lift the lane above
  // sibling lanes so the overlay's stacking context wins. Without this the
  // next lane's pills paint on top of this lane's panel.
  const activeClusterId = hoveredCluster ?? openCluster?.clusterId ?? null;
  const isActiveLane =
    (hoveredEvent?.eventKey != null &&
      looseEvents.some((e) => e.key === hoveredEvent.eventKey)) ||
    (activeClusterId != null &&
      (clusters.some((c) => c.id === activeClusterId) ||
        laneItems.some(
          (it) =>
            it.kind === "visual-cluster" && it.id === activeClusterId,
        )));

  return (
    <div
      className="relative max-lg:mb-1"
      style={{ zIndex: isActiveLane ? 30 : undefined }}
    >
      <div className="flex items-center gap-2 pb-1 lg:hidden">
        <span
          className="flex size-7 items-center justify-center rounded-md"
          style={{ background: meta.bg, color: meta.color }}
        >
          <LaneIcon className="size-3.5" />
        </span>
        <span className="text-xs font-medium text-slate-600">{meta.label}</span>
      </div>
      <div className="dash-grid h-14 items-stretch lg:h-11">
      <div className="hidden items-center gap-2 pl-1 lg:flex">
        <span
          className="flex size-6 items-center justify-center rounded-md"
          style={{ background: meta.bg, color: meta.color }}
        >
          <LaneIcon className="size-3.5" />
        </span>
        <span className="text-xs font-medium text-slate-600">
          {meta.label}
        </span>
      </div>

      <div className="hidden lg:block" />

      <div className="relative min-w-0">
        {width > 0 &&
          denseRegions.map((r, i) => {
            const left = xScale(r.start);
            const right = xScale(r.end);
            return (
              <div
                key={i}
                className="pointer-events-none absolute inset-y-1 rounded-md"
                style={{
                  left,
                  width: right - left,
                  background:
                    "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(139,92,246,0.04))",
                }}
              />
            );
          })}

        {width > 0 && pairStart && pairStop && (
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{
              left: xScale(pairStart.date),
              width: xScale(pairStop.date) - xScale(pairStart.date),
              height: 0,
              borderTop: `1px dashed ${meta.color}80`,
            }}
          />
        )}

        {width > 0 &&
          laneItems.map((item) => {
            if (item.kind === "single") {
              const ev = item.event;
              return (
                <EventMarker
                  key={ev.key}
                  event={ev}
                  hideLabel={labelHidden.has(ev.key)}
                  highlighted={
                    hoveredEvent?.eventKey === ev.key ||
                    (activePair?.some((p) => p.key === ev.key) ?? false)
                  }
                  onHover={() =>
                    setHoveredEvent({ eventKey: ev.key, pairId: ev.pairId })
                  }
                  onLeave={() => setHoveredEvent(null)}
                  onToggle={() =>
                    setHoveredEvent(
                      hoveredEvent?.eventKey === ev.key
                        ? null
                        : { eventKey: ev.key, pairId: ev.pairId },
                    )
                  }
                />
              );
            }
            const synthetic: Cluster = {
              id: item.id,
              category,
              date: item.date,
              events: item.events,
            };
            const isOpen = openCluster?.clusterId === synthetic.id;
            const isHovered = hoveredCluster === synthetic.id || isOpen;
            return (
              <ClusterPill
                key={synthetic.id}
                cluster={synthetic}
                hovered={isHovered}
                isOpen={isOpen}
                highlightStop={false}
                onMouseEnter={() => setHoveredCluster(synthetic.id)}
                onMouseLeave={() => setHoveredCluster(null)}
                onClick={() =>
                  setOpenCluster(
                    isOpen ? null : { clusterId: synthetic.id },
                  )
                }
                onClose={() => setOpenCluster(null)}
              />
            );
          })}

        {width > 0 &&
          visibleClusters.map((cluster) => {
            const isOpen = openCluster?.clusterId === cluster.id;
            const isHovered = hoveredCluster === cluster.id || isOpen;
            return (
              <ClusterPill
                key={cluster.id}
                cluster={cluster}
                hovered={isHovered}
                isOpen={isOpen}
                highlightStop={stopInClusterId === cluster.id}
                onMouseEnter={() => setHoveredCluster(cluster.id)}
                onMouseLeave={() => setHoveredCluster(null)}
                onClick={() =>
                  setOpenCluster(isOpen ? null : { clusterId: cluster.id })
                }
                onClose={() => setOpenCluster(null)}
              />
            );
          })}
      </div>

      <div className="hidden lg:block" />
      </div>
    </div>
  );
}

// Half of the size-6 icon — used to offset the wrapper so the icon's center
// (not its left edge) lands on the event's date.
const EVENT_ICON_HALF_PX = 12;

function eventAccessibleName(event: EventItem): string {
  const { verb, subject } = parseEventTitle(event.title, event.pairKind);
  const name = `${verb ? `${verb} ` : ""}${subject}`.trim();
  if (event.pairId && event.endDate) {
    const start = event.date < event.endDate ? event.date : event.endDate;
    const end = event.date < event.endDate ? event.endDate : event.date;
    return `${name}, ${formatDateTiny(start)} to ${formatDateTiny(end)}`;
  }
  if (event.pairId) {
    return `${name}, started ${formatDateTiny(event.date)}`;
  }
  return `${name}, ${formatDateTiny(event.date)}`;
}

function EventMarker({
  event,
  hideLabel,
  highlighted,
  onHover,
  onLeave,
  onToggle,
}: {
  event: EventItem;
  hideLabel: boolean;
  highlighted: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggle: () => void;
}) {
  const { xScale, width } = useTimeline();
  const meta = CATEGORY_META[event.category];
  const Icon =
    event.pairKind === "stop" ? Ban : categoryIcon(event.category);
  const left = xScale(event.date);
  const { verb, subject } = parseEventTitle(event.title, event.pairKind);
  const narrow = useNarrowScreen();
  // Flip only below lg. Chart width is also under 1024px on a desktop row,
  // so using it here would move tooltips that the wide layout already fit.
  const alignRight = narrow && width > 0 && left > width * 0.62;
  const pointerKind = useRef("");
  // Below lg the printed title is display:none, so the tooltip is the only
  // name. On lg+, keep the old rule: a tooltip only when the title is hidden
  // or this marker is one half of a pair.
  const desktopTooltip = Boolean(event.pairId || hideLabel);

  return (
    <button
      type="button"
      aria-expanded={highlighted}
      aria-label={eventAccessibleName(event)}
      className="absolute top-1/2 flex items-center gap-2 border-0 bg-transparent p-0 text-left max-lg:-m-2.5 max-lg:p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
      style={{
        left: left - EVENT_ICON_HALF_PX,
        transform: "translateY(-50%)",
      }}
      onPointerDown={(e) => {
        pointerKind.current = e.pointerType;
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") onHover();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "touch") return;
        // A tap focuses the button; a synthetic mouse leave after that
        // must not dismiss the tooltip while it stays focused.
        if (e.currentTarget === document.activeElement) return;
        onLeave();
      }}
      onFocus={() => {
        // Touch uses the click toggle. Focusing on pointerdown would turn the
        // tooltip on and the following click would immediately toggle it off.
        if (pointerKind.current === "touch") return;
        onHover();
      }}
      onBlur={onLeave}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.stopPropagation();
        onHover();
      }}
      onClick={(e) => {
        e.stopPropagation();
        const kind = pointerKind.current;
        pointerKind.current = "";
        if (kind !== "touch") return;
        e.currentTarget.focus();
        onToggle();
      }}
    >
      <span
        className="relative flex size-6 shrink-0 items-center justify-center rounded-full transition"
        style={{
          background: highlighted ? meta.color : meta.bg,
          color: highlighted ? "#fff" : meta.color,
          boxShadow: highlighted ? `0 0 0 3px ${meta.color}33` : "none",
        }}
      >
        <Icon className="size-3.5" />
      </span>

      {!hideLabel && (
        <div className="pointer-events-none hidden whitespace-nowrap leading-[1.15] lg:block">
          {verb && (
            <div className="text-[11px] font-medium text-slate-500">
              {verb}
            </div>
          )}
          <div className="text-[12px] font-semibold text-slate-800">
            {subject}
          </div>
        </div>
      )}

      {highlighted && (
        <div
          className={`pointer-events-none absolute bottom-full z-20 mb-2 w-max whitespace-nowrap max-lg:max-w-[min(16rem,calc(100vw-1.5rem))] max-lg:whitespace-normal ${
            desktopTooltip ? "" : "lg:hidden"
          } ${alignRight ? "right-0" : "left-0"}`}
        >
          {event.pairId ? (
            <PairTooltip event={event} />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-md">
              {verb ? `${verb} ` : ""}
              {subject}
              <span className="font-normal text-slate-500 lg:hidden">
                {" "}
                · {formatDateTiny(event.date)}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function PairTooltip({ event }: { event: EventItem }) {
  const { subject } = parseEventTitle(event.title, event.pairKind);
  const today = Date.now();
  if (event.endDate) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 shadow-md whitespace-nowrap">
        <span className="font-semibold text-slate-800">{subject}</span> ·{" "}
        {formatDateTiny(event.date < event.endDate ? event.date : event.endDate)} →{" "}
        {formatDateTiny(event.date < event.endDate ? event.endDate : event.date)} ·{" "}
        {daysBetween(event.date, event.endDate)} days
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 shadow-md whitespace-nowrap">
      <span className="font-semibold text-slate-800">{subject}</span> · started{" "}
      {formatDateTiny(event.date)} · ongoing · {daysBetween(event.date, today)} days
    </div>
  );
}

/* -------------------------- Cluster pill -------------------------- */

function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

const CLUSTER_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ClusterSheet({
  titleId,
  onClose,
  children,
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const inerted: Array<HTMLElement> = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (dialog && child.contains(dialog)) continue;
      if (child.hasAttribute("inert")) continue;
      child.setAttribute("inert", "");
      inerted.push(child);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(CLUSTER_FOCUSABLE),
      ).filter((el) => el.tabIndex !== -1);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      for (const el of inerted) el.removeAttribute("inert");
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-x-3 bottom-3 max-h-[min(70vh,32rem)] overflow-y-auto outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ClusterPanel({
  cluster,
  sorted,
  onClose,
  titleId,
}: {
  cluster: Cluster;
  sorted: Array<EventItem>;
  onClose: () => void;
  titleId: string;
}) {
  const meta = CATEGORY_META[cluster.category];
  const Icon = categoryIcon(cluster.category);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: meta.bg, color: meta.color }}
          >
            <Icon className="size-3.5" />
          </span>
          <span
            id={titleId}
            className="truncate text-[13px] font-semibold text-slate-900"
          >
            {meta.label}
          </span>
          <span className="text-slate-300">·</span>
          <span className="shrink-0 text-[12px] text-slate-500">
            {cluster.events.length} events
          </span>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 lg:size-auto lg:p-0.5"
        >
          <X className="size-4 lg:size-3.5" />
        </button>
      </div>
      <ul className="flex flex-col gap-1.5 text-[12px]">
        {sorted.map((e) => {
          const { verb, subject } = parseEventTitle(e.title, e.pairKind);
          return (
            <li key={e.key} className="flex items-center gap-2.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: meta.color }}
              />
              <span className="shrink-0 whitespace-nowrap text-slate-500 tabular-nums">
                {formatDateShort(e.date)}
              </span>
              <span className="min-w-0 font-medium text-slate-800">
                {verb ? `${verb} ` : ""}
                {subject}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ClusterPill({
  cluster,
  hovered,
  isOpen,
  highlightStop,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onClose,
}: {
  cluster: Cluster;
  hovered: boolean;
  isOpen: boolean;
  highlightStop: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onClose: () => void;
}) {
  const { xScale } = useTimeline();
  const meta = CATEGORY_META[cluster.category];
  const Icon = categoryIcon(cluster.category);
  const left = xScale(cluster.date);
  const sorted = [...cluster.events].sort((a, b) => a.date - b.date);
  const narrowScreen = useNarrowScreen();
  const narrow = isOpen && narrowScreen;
  const titleId = useId();

  const panel = (
    <ClusterPanel
      cluster={cluster}
      sorted={sorted}
      onClose={onClose}
      titleId={titleId}
    />
  );

  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") onMouseEnter();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") onMouseLeave();
      }}
    >
      {narrow && <ClusterSheet titleId={titleId} onClose={onClose}>{panel}</ClusterSheet>}
      <div className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`${cluster.events.length} ${meta.label} events`}
          onClick={(e) => {
            const native = e.nativeEvent;
            if ("pointerType" in native && native.pointerType === "touch") {
              e.stopPropagation();
            }
            onClick();
          }}
          className="relative flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs font-bold shadow-sm transition lg:h-6 lg:min-w-0 lg:px-2.5 lg:text-[11px]"
          style={{
            background: meta.pillBg,
            color: meta.pillText,
            boxShadow:
              hovered || highlightStop || isOpen
                ? `0 0 0 4px ${meta.pillBg}33`
                : "0 1px 2px rgba(0,0,0,0.08)",
            transform: hovered || isOpen ? "scale(1.04)" : undefined,
          }}
        >
          +{cluster.events.length}
        </button>

        {hovered && !isOpen && (
          <div className="pointer-events-none absolute left-1/2 bottom-full z-10 mb-2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
            <div className="mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="flex size-4 items-center justify-center rounded-sm"
                style={{ background: meta.bg, color: meta.color }}
              >
                <Icon className="size-2.5" />
              </span>
              <span className="text-[10.5px] font-semibold text-slate-700">
                {meta.label}
              </span>
              <span className="text-[10.5px] text-slate-400">·</span>
              <span className="text-[10.5px] text-slate-500">
                {cluster.events.length} events
              </span>
            </div>
            <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[11px]">
              {sorted.map((e) => {
                const { verb, subject } = parseEventTitle(e.title, e.pairKind);
                return (
                  <div key={e.key} className="contents">
                    <span className="whitespace-nowrap text-slate-500 tabular-nums">
                      {formatDateTiny(e.date)}
                    </span>
                    <span className="whitespace-nowrap font-medium text-slate-800">
                      {verb ? `${verb} ` : ""}
                      {subject}
                    </span>
                  </div>
                );
              })}
            </div>
            {highlightStop && (
              <div
                className="mt-2 rounded-md px-1.5 py-1 text-[10px] font-medium"
                style={{ background: meta.bg, color: meta.color }}
              >
                Contains matching stop event
              </div>
            )}
          </div>
        )}

        {!narrow && isOpen && (
          <div className="absolute left-1/2 bottom-full z-20 mb-3 w-[300px] -translate-x-1/2">
            {panel}
          </div>
        )}
      </div>
    </div>
  );
}

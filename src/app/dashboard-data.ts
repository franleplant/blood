export type MarkerStatus = "Optimal" | "Good" | "Borderline" | "High" | "Low";

export type MarkerPoint = { ms: number; value: number };

export type RangeTone = "high" | "borderline" | "optimal" | "low";

export type RangeRow = {
  /** Left-side label, e.g. "High", "Optimal", "Low". */
  label: string;
  /** Right-side threshold text, e.g. "> 125", "70 – 100", "< 70". */
  text: string;
  /** Color tone — controls both label and text color. */
  tone: RangeTone;
};

export type Marker = {
  id: string;
  name: string;
  unit: string;
  derived: boolean;
  color: string;
  /** Background bands top→bottom (high→low value). */
  zoneTop: string;
  zoneMid: string;
  zoneBottom: string;
  yMin: number;
  yMax: number;
  /** What the latest value collapses to. */
  latest: number;
  status: MarkerStatus;
  data: MarkerPoint[];
  /** Standard reference ranges shown in the dashboard's Range column. */
  rangeRows: RangeRow[];
};

export type EventCategory =
  | "medications"
  | "supplements"
  | "lifestyle"
  | "nutrition"
  | "sleep"
  | "training";

export type EventItem = {
  id: string;
  /** Render key — for range events with two icons we emit start + stop with the same eventId but different keys. */
  key: string;
  date: number;
  endDate?: number;
  category: EventCategory;
  title: string;
  /** "start" / "stop" / "point" — for range events we emit one start + one stop entry. */
  pairKind: "start" | "stop" | "point";
  /** ID shared by both halves of a range event. */
  pairId?: string;
  hideLabel?: boolean;
};

export type Cluster = {
  id: string;
  category: EventCategory;
  date: number;
  events: EventItem[];
};

export type DenseRegion = { start: number; end: number };

export type SidebarCounts = {
  all: number;
  outOfRange: number;
  derived: number;
  raw: number;
  improving: number;
  worsening: number;
  mostChanged: number;
};

export type TrendIds = {
  improving: string[];
  worsening: string[];
  mostChanged: string[];
};

export type MarkerCategory =
  | "metabolic"
  | "blood-sugar"
  | "lipids"
  | "liver"
  | "kidney"
  | "blood"
  | "nutrients"
  | "hormones";

/** Display order for the sidebar Categories section. */
export const MARKER_CATEGORY_ORDER: MarkerCategory[] = [
  "metabolic",
  "blood-sugar",
  "lipids",
  "liver",
  "kidney",
  "blood",
  "nutrients",
  "hormones",
];

export const MARKER_CATEGORY_LABELS: Record<MarkerCategory, string> = {
  metabolic: "Metabolic",
  "blood-sugar": "Blood Sugar",
  lipids: "Lipids",
  liver: "Liver",
  kidney: "Kidney",
  blood: "Blood Count",
  nutrients: "Nutrients",
  hormones: "Hormones",
};

/**
 * Categories whose markers are excluded from the default ("All Markers")
 * view and from quick-filter counts. They remain reachable by clicking the
 * specific category in the sidebar.
 */
export const DEFAULT_HIDDEN_CATEGORIES: MarkerCategory[] = ["blood"];

/** Marker id → category. Markers not listed are uncategorised. */
export const MARKER_CATEGORIES: Record<string, MarkerCategory> = {
  glucose: "blood-sugar",
  insulin: "blood-sugar",
  hba1c: "blood-sugar",
  homair: "metabolic",
  trig_hdl_ratio: "metabolic",
  uric_acid: "metabolic",
  triglycerides: "lipids",
  total_cholesterol: "lipids",
  ldl: "lipids",
  hdl: "lipids",
  ast: "liver",
  alt: "liver",
  ggt: "liver",
  alkaline_phosphatase: "liver",
  total_bilirubin: "liver",
  creatinine: "kidney",
  urea: "kidney",
  hemoglobin: "blood",
  hematocrit: "blood",
  wbc: "blood",
  platelets: "blood",
  ferritin: "nutrients",
  vitamin_b12: "nutrients",
  testosterone: "hormones",
  free_testosterone: "hormones",
  bioavailable_testosterone: "hormones",
  estradiol: "hormones",
  fsh: "hormones",
  lh: "hormones",
  prolactin: "hormones",
  free_t4: "hormones",
  total_t3: "hormones",
  cortisol: "hormones",
  tsh: "hormones",
};

export type DashboardData = {
  markers: Marker[];
  events: EventItem[];
  clusters: Cluster[];
  denseRegions: DenseRegion[];
  categoriesPresent: EventCategory[];
  timelineStart: number;
  timelineEnd: number;
  latestSampleMs: number | null;
  sidebarCounts: SidebarCounts;
  markerCategoryCounts: Record<MarkerCategory, number>;
  trendIds: TrendIds;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function timelinePctOf(
  ms: number,
  start: number,
  end: number,
): number {
  if (end <= start) return 0;
  return ((ms - start) / (end - start)) * 100;
}

export function buildMonthTicks(
  start: number,
  end: number,
): { label: string; ms: number }[] {
  const out: { label: string; ms: number }[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(end);
  while (cursor.getTime() <= endDate.getTime()) {
    const month = cursor.toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    const yy = String(cursor.getUTCFullYear()).slice(2);
    out.push({ label: `${month} '${yy}`, ms: cursor.getTime() });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  // Trim leading/trailing ticks that are too close to the timeline edge
  return out.filter(
    (t) =>
      timelinePctOf(t.ms, start, end) >= -1 &&
      timelinePctOf(t.ms, start, end) <= 101,
  );
}

export function formatDateShort(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTiny(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function daysBetween(a: number, b: number): number {
  return Math.round(Math.abs(b - a) / DAY_MS);
}

const VERB_PATTERNS: { pattern: RegExp; verb: string }[] = [
  { pattern: /^(starts?|started)\s+/i, verb: "Started" },
  { pattern: /^(stops?|stopped)\s+/i, verb: "Stopped" },
  { pattern: /^(reduces?|reduced)\s+/i, verb: "Reduced" },
  { pattern: /^(improves?|improved)\s+/i, verb: "Improved" },
  { pattern: /^(adds?|added)\s+/i, verb: "Added" },
  { pattern: /^(increases?|increased)\s+/i, verb: "Increased" },
  { pattern: /^(decreases?|decreased)\s+/i, verb: "Decreased" },
];

function titleCaseWord(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Splits a free-form event title like "starts metformin" into
 * {verb: "Started", subject: "Metformin"}.
 *
 * For pair-stop entries, the verb is forced to "Stopped" regardless of the
 * underlying title (which is shared with the start half).
 *
 * Falls back to deriving verb from `pairKind` when the title has no recognised
 * action prefix (e.g. "Clomifeno course" + start → "Started Clomifeno Course").
 */
export function parseEventTitle(
  title: string,
  pairKind: "start" | "stop" | "point",
): { verb: string; subject: string } {
  const trimmed = title.trim();
  for (const { pattern, verb } of VERB_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const subject = trimmed.slice(match[0].length).trim();
      return {
        verb: pairKind === "stop" ? "Stopped" : verb,
        subject: titleCaseWord(subject),
      };
    }
  }
  if (pairKind === "stop") return { verb: "Stopped", subject: titleCaseWord(trimmed) };
  if (pairKind === "start") return { verb: "Started", subject: titleCaseWord(trimmed) };
  return { verb: "", subject: titleCaseWord(trimmed) };
}

/**
 * Cluster events of the same category that fall within `windowDays` of each other.
 * Returns the input events partitioned into:
 *   - clusters: groups of {threshold}+ events
 *   - looseEvents: events not clustered
 */
export function buildClusters(
  events: EventItem[],
  options: { windowDays?: number; threshold?: number } = {},
): { clusters: Cluster[]; looseEvents: EventItem[] } {
  const windowMs = (options.windowDays ?? 21) * DAY_MS;
  const threshold = options.threshold ?? 3;

  const byCategory = new Map<EventCategory, EventItem[]>();
  for (const e of events) {
    const arr = byCategory.get(e.category) ?? [];
    arr.push(e);
    byCategory.set(e.category, arr);
  }

  const clusters: Cluster[] = [];
  const clusteredKeys = new Set<string>();

  for (const [category, list] of byCategory) {
    const sorted = [...list].sort((a, b) => a.date - b.date);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1].date - sorted[i].date <= windowMs) {
        j++;
      }
      const groupSize = j - i + 1;
      if (groupSize >= threshold) {
        const group = sorted.slice(i, j + 1);
        const center =
          group.reduce((acc, e) => acc + e.date, 0) / group.length;
        clusters.push({
          id: `cluster-${category}-${i}`,
          category,
          date: center,
          events: group,
        });
        for (const e of group) clusteredKeys.add(e.key);
        i = j + 1;
      } else {
        i++;
      }
    }
  }

  const looseEvents = events.filter((e) => !clusteredKeys.has(e.key));
  return { clusters, looseEvents };
}

export function denseRegionsFromClusters(
  clusters: Cluster[],
  paddingDays = 3,
): DenseRegion[] {
  if (clusters.length === 0) return [];
  const pad = paddingDays * DAY_MS;
  // Merge per-cluster spans into combined dense regions
  const spans = clusters
    .map((c) => {
      const dates = c.events.map((e) => e.date);
      return {
        start: Math.min(...dates) - pad,
        end: Math.max(...dates) + pad,
      };
    })
    .sort((a, b) => a.start - b.start);
  const merged: DenseRegion[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

export const CATEGORY_META: Record<
  EventCategory,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    pillBg: string;
    pillText: string;
  }
> = {
  medications: {
    label: "Medications",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    pillBg: "#8b5cf6",
    pillText: "#ffffff",
  },
  supplements: {
    label: "Supplements",
    color: "#ec4899",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    pillBg: "#ec4899",
    pillText: "#ffffff",
  },
  lifestyle: {
    label: "Lifestyle",
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
    pillBg: "#3b82f6",
    pillText: "#ffffff",
  },
  nutrition: {
    label: "Nutrition",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    pillBg: "#22c55e",
    pillText: "#ffffff",
  },
  sleep: {
    label: "Sleep / Wellbeing",
    color: "#7c3aed",
    bg: "#faf5ff",
    border: "#e9d5ff",
    pillBg: "#a855f7",
    pillText: "#ffffff",
  },
  training: {
    label: "Training",
    color: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    pillBg: "#0ea5e9",
    pillText: "#ffffff",
  },
};

/** Lane order shown in the UI (only categories with events appear). */
export const CATEGORY_ORDER: EventCategory[] = [
  "medications",
  "supplements",
  "lifestyle",
  "nutrition",
  "sleep",
  "training",
];

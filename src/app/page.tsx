import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";
import Dashboard from "./Dashboard";
import {
  buildClusters,
  type Cluster,
  type DashboardData,
  DEFAULT_HIDDEN_CATEGORIES,
  denseRegionsFromClusters,
  type EventCategory,
  type EventItem,
  MARKER_CATEGORIES,
  MARKER_CATEGORY_ORDER,
  type Marker,
  type MarkerCategory,
  type MarkerPoint,
  type MarkerStatus,
  type RangeRow,
} from "./dashboard-data";

const KNOWN_CATEGORIES: EventCategory[] = [
  "medications",
  "supplements",
  "lifestyle",
  "nutrition",
  "sleep",
  "training",
];

type MarkerSpec = {
  id: string;
  name: string;
  unit: string;
  derived: boolean;
  color: string;
  zoneTop: string;
  zoneMid: string;
  zoneBottom: string;
  yMin: number;
  yMax: number;
  /** Higher-is-better thresholds invert the band coloring. */
  higherIsBetter?: boolean;
  /** Optimal range — anything inside is "Optimal". */
  optimalMin: number;
  optimalMax: number;
  /** Borderline outer bound on the bad side — outside this is "High"/"Low". */
  borderlineMax?: number;
  borderlineMin?: number;
  /** Reference ranges shown in the Range column. */
  rangeRows: RangeRow[];
};

const MARKER_SPECS: Record<string, MarkerSpec> = {
  glucose: {
    id: "glucose",
    name: "Glucose",
    unit: "mg/dL",
    derived: false,
    color: "#2563eb",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fff7ed",
    yMin: 70,
    yMax: 120,
    optimalMin: 75,
    optimalMax: 95,
    borderlineMax: 105,
    rangeRows: [
      { label: "High", text: "> 125", tone: "high" },
      { label: "Optimal", text: "70 – 100", tone: "optimal" },
      { label: "Low", text: "< 70", tone: "low" },
    ],
  },
  insulin: {
    id: "insulin",
    name: "Insulin",
    unit: "µUI/mL",
    derived: false,
    color: "#10b981",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fff7ed",
    yMin: 2,
    yMax: 14,
    optimalMin: 3,
    optimalMax: 8,
    borderlineMax: 11,
    rangeRows: [
      { label: "High", text: "> 15", tone: "high" },
      { label: "Optimal", text: "2 – 8", tone: "optimal" },
      { label: "Low", text: "< 2", tone: "low" },
    ],
  },
  homair: {
    id: "homair",
    name: "HOMA-IR",
    unit: "(derived)",
    derived: true,
    color: "#8b5cf6",
    zoneTop: "#fef2f2",
    zoneMid: "#f5f3ff",
    zoneBottom: "#eff6ff",
    yMin: 0.4,
    yMax: 3.0,
    optimalMin: 0.5,
    optimalMax: 1.6,
    borderlineMax: 2.0,
    rangeRows: [
      { label: "High", text: "> 2.9", tone: "high" },
      { label: "Optimal", text: "< 1.9", tone: "optimal" },
      { label: "Optimal", text: "< 1.0", tone: "optimal" },
    ],
  },
  hba1c: {
    id: "hba1c",
    name: "HbA1c",
    unit: "%",
    derived: false,
    color: "#f59e0b",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 4.5,
    yMax: 6.4,
    optimalMin: 4.8,
    optimalMax: 5.4,
    borderlineMax: 5.7,
    rangeRows: [
      { label: "High", text: "> 5.7", tone: "high" },
      { label: "Optimal", text: "4.0 – 5.6", tone: "optimal" },
      { label: "Low", text: "< 4.0", tone: "low" },
    ],
  },
  triglycerides: {
    id: "triglycerides",
    name: "Triglycerides",
    unit: "mg/dL",
    derived: false,
    color: "#ef4444",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 40,
    yMax: 200,
    optimalMin: 40,
    optimalMax: 100,
    borderlineMax: 150,
    rangeRows: [
      { label: "High", text: "> 150", tone: "high" },
      { label: "Borderline", text: "100 – 150", tone: "borderline" },
      { label: "Optimal", text: "< 100", tone: "optimal" },
    ],
  },
  hdl: {
    id: "hdl",
    name: "HDL-C",
    unit: "mg/dL",
    derived: false,
    color: "#0ea5e9",
    zoneTop: "#f0fdf4",
    zoneMid: "#fff7ed",
    zoneBottom: "#fef2f2",
    yMin: 30,
    yMax: 90,
    higherIsBetter: true,
    optimalMin: 50,
    optimalMax: 90,
    borderlineMin: 40,
    rangeRows: [
      { label: "Low", text: "< 40", tone: "high" },
      { label: "Optimal", text: "≥ 40", tone: "optimal" },
    ],
  },
  trig_hdl_ratio: {
    id: "trig_hdl_ratio",
    name: "Trig / HDL Ratio",
    unit: "(derived)",
    derived: true,
    color: "#d946ef",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 0.3,
    yMax: 5,
    optimalMin: 0.3,
    optimalMax: 2,
    borderlineMax: 4,
    rangeRows: [
      { label: "High", text: "> 4", tone: "high" },
      { label: "Borderline", text: "2 – 4", tone: "borderline" },
      { label: "Optimal", text: "< 2", tone: "optimal" },
    ],
  },
  uric_acid: {
    id: "uric_acid",
    name: "Uric Acid",
    unit: "mg/dL",
    derived: false,
    color: "#f97316",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 2,
    yMax: 8,
    optimalMin: 3.5,
    optimalMax: 6,
    borderlineMax: 7,
    rangeRows: [
      { label: "High", text: "> 7", tone: "high" },
      { label: "Optimal", text: "3.5 – 7", tone: "optimal" },
      { label: "Low", text: "< 3.5", tone: "low" },
    ],
  },
  ast: {
    id: "ast",
    name: "AST",
    unit: "U/L",
    derived: false,
    color: "#14b8a6",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 5,
    yMax: 50,
    optimalMin: 5,
    optimalMax: 25,
    borderlineMax: 40,
    rangeRows: [
      { label: "High", text: "> 40", tone: "high" },
      { label: "Optimal", text: "< 40", tone: "optimal" },
    ],
  },
  alt: {
    id: "alt",
    name: "ALT",
    unit: "U/L",
    derived: false,
    color: "#84cc16",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 5,
    yMax: 60,
    optimalMin: 5,
    optimalMax: 25,
    borderlineMax: 40,
    rangeRows: [
      { label: "High", text: "> 40", tone: "high" },
      { label: "Optimal", text: "< 40", tone: "optimal" },
    ],
  },
  ggt: {
    id: "ggt",
    name: "GGT",
    unit: "U/L",
    derived: false,
    color: "#f43f5e",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 5,
    yMax: 80,
    optimalMin: 5,
    optimalMax: 30,
    borderlineMax: 55,
    rangeRows: [
      { label: "High", text: "> 55", tone: "high" },
      { label: "Optimal", text: "< 55", tone: "optimal" },
    ],
  },
  testosterone: {
    id: "testosterone",
    name: "Testosterone",
    unit: "ng/mL",
    derived: false,
    color: "#6366f1",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 1.5,
    yMax: 12,
    optimalMin: 4,
    optimalMax: 8,
    borderlineMax: 11,
    borderlineMin: 2.8,
    rangeRows: [
      { label: "High", text: "> 11", tone: "high" },
      { label: "Optimal", text: "2.8 – 11", tone: "optimal" },
      { label: "Low", text: "< 2.8", tone: "low" },
    ],
  },
  estradiol: {
    id: "estradiol",
    name: "Estradiol",
    unit: "pg/mL",
    derived: false,
    color: "#a855f7",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 5,
    yMax: 60,
    optimalMin: 15,
    optimalMax: 40,
    borderlineMax: 50,
    borderlineMin: 10,
    rangeRows: [
      { label: "High", text: "> 44", tone: "high" },
      { label: "Optimal", text: "10 – 44", tone: "optimal" },
      { label: "Low", text: "< 10", tone: "low" },
    ],
  },
  tsh: {
    id: "tsh",
    name: "TSH",
    unit: "µUI/mL",
    derived: false,
    color: "#06b6d4",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0.2,
    yMax: 5,
    optimalMin: 0.8,
    optimalMax: 2.5,
    borderlineMax: 4,
    borderlineMin: 0.4,
    rangeRows: [
      { label: "High", text: "> 4.0", tone: "high" },
      { label: "Optimal", text: "0.4 – 4.0", tone: "optimal" },
      { label: "Low", text: "< 0.4", tone: "low" },
    ],
  },
  fsh: {
    id: "fsh",
    name: "FSH",
    unit: "mUI/mL",
    derived: false,
    color: "#db2777",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0,
    yMax: 14,
    optimalMin: 2,
    optimalMax: 10,
    borderlineMax: 12.4,
    borderlineMin: 1.5,
    rangeRows: [
      { label: "High", text: "> 12.4", tone: "high" },
      { label: "Optimal", text: "1.5 – 12.4", tone: "optimal" },
      { label: "Low", text: "< 1.5", tone: "low" },
    ],
  },
  lh: {
    id: "lh",
    name: "LH",
    unit: "mUI/mL",
    derived: false,
    color: "#ea580c",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0,
    yMax: 12,
    optimalMin: 2,
    optimalMax: 7,
    borderlineMax: 8.6,
    borderlineMin: 1.7,
    rangeRows: [
      { label: "High", text: "> 8.6", tone: "high" },
      { label: "Optimal", text: "1.7 – 8.6", tone: "optimal" },
      { label: "Low", text: "< 1.7", tone: "low" },
    ],
  },
  prolactin: {
    id: "prolactin",
    name: "Prolactin",
    unit: "ng/mL",
    derived: false,
    color: "#c026d3",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 2,
    yMax: 22,
    optimalMin: 4,
    optimalMax: 12,
    borderlineMax: 15.2,
    borderlineMin: 4,
    rangeRows: [
      { label: "High", text: "> 15.2", tone: "high" },
      { label: "Optimal", text: "4 – 15.2", tone: "optimal" },
      { label: "Low", text: "< 4", tone: "low" },
    ],
  },
  free_testosterone: {
    id: "free_testosterone",
    name: "Free Testosterone",
    unit: "pg/mL",
    derived: false,
    color: "#4338ca",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 30,
    yMax: 250,
    optimalMin: 80,
    optimalMax: 200,
    borderlineMax: 250,
    borderlineMin: 50,
    rangeRows: [
      { label: "High", text: "> 250", tone: "high" },
      { label: "Optimal", text: "50 – 250", tone: "optimal" },
      { label: "Low", text: "< 50", tone: "low" },
    ],
  },
  bioavailable_testosterone: {
    id: "bioavailable_testosterone",
    name: "Bioavailable T",
    unit: "ng/mL",
    derived: false,
    color: "#7c3aed",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0.5,
    yMax: 6,
    optimalMin: 2,
    optimalMax: 4,
    borderlineMax: 4.5,
    borderlineMin: 1.5,
    rangeRows: [
      { label: "High", text: "> 4.5", tone: "high" },
      { label: "Optimal", text: "1.5 – 4.5", tone: "optimal" },
      { label: "Low", text: "< 1.5", tone: "low" },
    ],
  },
  cortisol: {
    id: "cortisol",
    name: "Cortisol",
    unit: "µg/dL",
    derived: false,
    color: "#ca8a04",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 4,
    yMax: 25,
    optimalMin: 8,
    optimalMax: 15,
    borderlineMax: 19.4,
    borderlineMin: 6.2,
    rangeRows: [
      { label: "High", text: "> 19.4", tone: "high" },
      { label: "Optimal", text: "6.2 – 19.4", tone: "optimal" },
      { label: "Low", text: "< 6.2", tone: "low" },
    ],
  },
  total_cholesterol: {
    id: "total_cholesterol",
    name: "Total Cholesterol",
    unit: "mg/dL",
    derived: false,
    color: "#b45309",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 130,
    yMax: 280,
    optimalMin: 130,
    optimalMax: 200,
    borderlineMax: 240,
    rangeRows: [
      { label: "High", text: "> 240", tone: "high" },
      { label: "Borderline", text: "200 – 240", tone: "borderline" },
      { label: "Optimal", text: "< 200", tone: "optimal" },
    ],
  },
  ldl: {
    id: "ldl",
    name: "LDL-C",
    unit: "mg/dL",
    derived: false,
    color: "#b91c1c",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 60,
    yMax: 200,
    optimalMin: 60,
    optimalMax: 100,
    borderlineMax: 130,
    rangeRows: [
      { label: "High", text: "> 130", tone: "high" },
      { label: "Borderline", text: "100 – 130", tone: "borderline" },
      { label: "Optimal", text: "< 100", tone: "optimal" },
    ],
  },
  alkaline_phosphatase: {
    id: "alkaline_phosphatase",
    name: "Alk Phosphatase",
    unit: "U/L",
    derived: false,
    color: "#4d7c0f",
    zoneTop: "#fef2f2",
    zoneMid: "#fff7ed",
    zoneBottom: "#f0fdf4",
    yMin: 30,
    yMax: 280,
    optimalMin: 40,
    optimalMax: 130,
    borderlineMax: 150,
    rangeRows: [
      { label: "High", text: "> 150", tone: "high" },
      { label: "Optimal", text: "40 – 150", tone: "optimal" },
    ],
  },
  total_bilirubin: {
    id: "total_bilirubin",
    name: "Total Bilirubin",
    unit: "mg/dL",
    derived: false,
    color: "#d97706",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#f0fdf4",
    yMin: 0,
    yMax: 1.5,
    optimalMin: 0.1,
    optimalMax: 1.0,
    borderlineMax: 1.2,
    rangeRows: [
      { label: "High", text: "> 1.2", tone: "high" },
      { label: "Optimal", text: "0.1 – 1.2", tone: "optimal" },
    ],
  },
  free_t4: {
    id: "free_t4",
    name: "Free T4",
    unit: "ng/dL",
    derived: false,
    color: "#0369a1",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0.5,
    yMax: 2.2,
    optimalMin: 0.9,
    optimalMax: 1.6,
    borderlineMax: 1.8,
    borderlineMin: 0.8,
    rangeRows: [
      { label: "High", text: "> 1.8", tone: "high" },
      { label: "Optimal", text: "0.8 – 1.8", tone: "optimal" },
      { label: "Low", text: "< 0.8", tone: "low" },
    ],
  },
  total_t3: {
    id: "total_t3",
    name: "Total T3",
    unit: "ng/mL",
    derived: false,
    color: "#0284c7",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0.5,
    yMax: 2.2,
    optimalMin: 0.9,
    optimalMax: 1.6,
    borderlineMax: 1.8,
    borderlineMin: 0.8,
    rangeRows: [
      { label: "High", text: "> 1.8", tone: "high" },
      { label: "Optimal", text: "0.8 – 1.8", tone: "optimal" },
      { label: "Low", text: "< 0.8", tone: "low" },
    ],
  },
  creatinine: {
    id: "creatinine",
    name: "Creatinine",
    unit: "mg/dL",
    derived: false,
    color: "#0891b2",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0.5,
    yMax: 1.6,
    optimalMin: 0.7,
    optimalMax: 1.2,
    borderlineMax: 1.3,
    borderlineMin: 0.6,
    rangeRows: [
      { label: "High", text: "> 1.3", tone: "high" },
      { label: "Optimal", text: "0.7 – 1.3", tone: "optimal" },
      { label: "Low", text: "< 0.7", tone: "low" },
    ],
  },
  urea: {
    id: "urea",
    name: "Urea",
    unit: "mg/dL",
    derived: false,
    color: "#0d9488",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 10,
    yMax: 60,
    optimalMin: 15,
    optimalMax: 40,
    borderlineMax: 50,
    rangeRows: [
      { label: "High", text: "> 50", tone: "high" },
      { label: "Optimal", text: "15 – 50", tone: "optimal" },
      { label: "Low", text: "< 15", tone: "low" },
    ],
  },
  hemoglobin: {
    id: "hemoglobin",
    name: "Hemoglobin",
    unit: "g/dL",
    derived: false,
    color: "#be123c",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 12,
    yMax: 18.5,
    higherIsBetter: false,
    optimalMin: 13.5,
    optimalMax: 17.5,
    borderlineMax: 18,
    borderlineMin: 13,
    rangeRows: [
      { label: "High", text: "> 18", tone: "high" },
      { label: "Optimal", text: "13.5 – 17.5", tone: "optimal" },
      { label: "Low", text: "< 13.5", tone: "low" },
    ],
  },
  hematocrit: {
    id: "hematocrit",
    name: "Hematocrit",
    unit: "%",
    derived: false,
    color: "#9f1239",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 38,
    yMax: 53,
    optimalMin: 41,
    optimalMax: 50,
    borderlineMax: 52,
    borderlineMin: 40,
    rangeRows: [
      { label: "High", text: "> 52", tone: "high" },
      { label: "Optimal", text: "41 – 50", tone: "optimal" },
      { label: "Low", text: "< 41", tone: "low" },
    ],
  },
  wbc: {
    id: "wbc",
    name: "WBC",
    unit: "K/µL",
    derived: false,
    color: "#92400e",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 3,
    yMax: 13,
    optimalMin: 4,
    optimalMax: 10,
    borderlineMax: 11,
    borderlineMin: 4,
    rangeRows: [
      { label: "High", text: "> 11", tone: "high" },
      { label: "Optimal", text: "4 – 11", tone: "optimal" },
      { label: "Low", text: "< 4", tone: "low" },
    ],
  },
  platelets: {
    id: "platelets",
    name: "Platelets",
    unit: "K/µL",
    derived: false,
    color: "#6b21a8",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 100,
    yMax: 450,
    optimalMin: 150,
    optimalMax: 400,
    borderlineMax: 425,
    borderlineMin: 140,
    rangeRows: [
      { label: "High", text: "> 425", tone: "high" },
      { label: "Optimal", text: "150 – 400", tone: "optimal" },
      { label: "Low", text: "< 150", tone: "low" },
    ],
  },
  ferritin: {
    id: "ferritin",
    name: "Ferritin",
    unit: "ng/mL",
    derived: false,
    color: "#a16207",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 0,
    yMax: 400,
    optimalMin: 30,
    optimalMax: 300,
    borderlineMax: 350,
    borderlineMin: 30,
    rangeRows: [
      { label: "High", text: "> 350", tone: "high" },
      { label: "Optimal", text: "30 – 350", tone: "optimal" },
      { label: "Low", text: "< 30", tone: "low" },
    ],
  },
  vitamin_b12: {
    id: "vitamin_b12",
    name: "Vitamin B12",
    unit: "pg/mL",
    derived: false,
    color: "#15803d",
    zoneTop: "#fef2f2",
    zoneMid: "#f0fdf4",
    zoneBottom: "#fef2f2",
    yMin: 100,
    yMax: 1000,
    higherIsBetter: false,
    optimalMin: 200,
    optimalMax: 900,
    borderlineMax: 950,
    borderlineMin: 200,
    rangeRows: [
      { label: "High", text: "> 950", tone: "high" },
      { label: "Optimal", text: "200 – 950", tone: "optimal" },
      { label: "Low", text: "< 200", tone: "low" },
    ],
  },
};

function classifyStatus(spec: MarkerSpec, value: number): MarkerStatus {
  if (spec.higherIsBetter) {
    if (value >= spec.optimalMin) return "Optimal";
    if (spec.borderlineMin !== undefined && value >= spec.borderlineMin)
      return "Borderline";
    return "Low";
  }
  if (value <= spec.optimalMax && value >= spec.optimalMin) return "Optimal";
  if (
    spec.borderlineMax !== undefined &&
    value <= spec.borderlineMax &&
    value >= spec.optimalMin
  )
    return "Borderline";
  if (spec.borderlineMax !== undefined && value > spec.borderlineMax)
    return "High";
  if (value < spec.optimalMin) return "Low";
  return "Optimal";
}

function safeParseFloat(raw: string): number | null {
  const cleaned = raw.replace(",", ".").replace(/^</, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function fetchSimpleMarker(
  userId: number,
  spec: MarkerSpec,
  searchTerms: string | string[],
  targetUnit:
    | "mg/dL"
    | "%"
    | "µUI/mL"
    | "U/L"
    | "ng/mL"
    | "ng/dL"
    | "pg/mL"
    | "µg/dL"
    | "g/dL"
    | "K/µL",
  excludePatterns: string[] = [],
): Promise<Marker | null> {
  const { prisma } = await openDatabase();
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  const rows = await prisma.labResult.findMany({
    where: {
      user_id: userId,
      OR: terms.map((t) => ({ marker_name_en: { contains: t } })),
      unit: { not: "" },
    },
    orderBy: { date: "asc" },
  });

  const filtered = rows.filter((r) => {
    const en = r.marker_name_en.toLowerCase();
    return !excludePatterns.some((p) => en.includes(p));
  });

  const data: MarkerPoint[] = [];
  for (const r of filtered) {
    if (!r.unit) continue;
    try {
      const normalized = normalizeUnits(
        { value: String(r.value), unit: r.unit },
        targetUnit,
      );
      const v = safeParseFloat(normalized.value);
      if (v == null) continue;
      const ms = new Date(r.date).getTime();
      if (!Number.isFinite(ms)) continue;
      data.push({ ms, value: v });
    } catch {
      // unit unsupported; skip
    }
  }

  if (data.length === 0) return null;

  data.sort((a, b) => a.ms - b.ms);
  const latest = data[data.length - 1].value;
  const status = classifyStatus(spec, latest);
  const observedMin = Math.min(...data.map((p) => p.value));
  const observedMax = Math.max(...data.map((p) => p.value));
  const yMin = Math.min(spec.yMin, observedMin - (observedMax - observedMin) * 0.1);
  const yMax = Math.max(spec.yMax, observedMax + (observedMax - observedMin) * 0.1);

  return {
    id: spec.id,
    name: spec.name,
    unit: spec.unit,
    derived: spec.derived,
    color: spec.color,
    zoneTop: spec.zoneTop,
    zoneMid: spec.zoneMid,
    zoneBottom: spec.zoneBottom,
    yMin,
    yMax,
    latest,
    status,
    data,
    rangeRows: spec.rangeRows,
  };
}

async function fetchHomaIR(userId: number): Promise<Marker | null> {
  const { prisma } = await openDatabase();
  const rows = await prisma.$queryRaw<
    Array<{
      date: string;
      glucose_value: string;
      glucose_unit: string;
      insulin_value: string;
      insulin_unit: string | null;
    }>
  >`
    SELECT g.date, g.value AS glucose_value, g.unit AS glucose_unit,
           i.value AS insulin_value, i.unit AS insulin_unit
    FROM (
      SELECT date, value, unit FROM lab_results
      WHERE LOWER(marker_name_en) LIKE '%glucose%'
        AND LOWER(marker_name_en) NOT LIKE '%minutes%'
        AND LOWER(marker_name_en) NOT LIKE '%urine%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS g
    JOIN (
      SELECT date, value, unit FROM lab_results
      WHERE LOWER(marker_name_en) LIKE '%insulin%'
        AND LOWER(marker_name_en) NOT LIKE '%minutes%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS i
    ON g.date = i.date
    ORDER BY g.date ASC
  `;

  const spec = MARKER_SPECS.homair;
  const data: MarkerPoint[] = [];
  for (const r of rows) {
    try {
      const glucoseMgDl = parseFloat(
        normalizeUnits(
          { value: String(r.glucose_value), unit: r.glucose_unit },
          "mg/dL",
        ).value,
      );
      const insulinUnit = (r.insulin_unit ?? "").toLowerCase();
      const isMicroUI =
        insulinUnit === "µui/ml" ||
        insulinUnit === "uui/ml" ||
        insulinUnit === "mui/ml" ||
        insulinUnit === "µu/ml" ||
        insulinUnit === "uu/ml" ||
        insulinUnit === "mu/ml";
      if (!isMicroUI) continue;
      const insulinUml = parseFloat(String(r.insulin_value).replace(",", "."));
      if (!Number.isFinite(glucoseMgDl) || !Number.isFinite(insulinUml))
        continue;
      const value = (glucoseMgDl * insulinUml) / 405;
      const ms = new Date(r.date).getTime();
      if (!Number.isFinite(ms)) continue;
      data.push({ ms, value });
    } catch {
      // skip
    }
  }
  if (data.length === 0) return null;
  data.sort((a, b) => a.ms - b.ms);
  const latest = data[data.length - 1].value;
  const status = classifyStatus(spec, latest);
  return {
    id: spec.id,
    name: spec.name,
    unit: spec.unit,
    derived: spec.derived,
    color: spec.color,
    zoneTop: spec.zoneTop,
    zoneMid: spec.zoneMid,
    zoneBottom: spec.zoneBottom,
    yMin: spec.yMin,
    yMax: spec.yMax,
    latest,
    status,
    data,
    rangeRows: spec.rangeRows,
  };
}

async function fetchTrigHdlRatio(userId: number): Promise<Marker | null> {
  const { prisma } = await openDatabase();
  const rows = await prisma.$queryRaw<
    Array<{
      date: string;
      t_value: string;
      t_unit: string;
      h_value: string;
      h_unit: string;
    }>
  >`
    SELECT t.date,
           t.value AS t_value, t.unit AS t_unit,
           h.value AS h_value, h.unit AS h_unit
    FROM (
      SELECT date, value, unit FROM lab_results
      WHERE LOWER(marker_name_en) LIKE '%triglycerides%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS t
    JOIN (
      SELECT date, value, unit FROM lab_results
      WHERE LOWER(marker_name_en) LIKE '%hdl cholesterol%'
        AND LOWER(marker_name_en) NOT LIKE '%non-hdl%'
        AND LOWER(marker_name_en) NOT LIKE '%ratio%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS h
    ON t.date = h.date
    ORDER BY t.date ASC
  `;

  const spec = MARKER_SPECS.trig_hdl_ratio;
  const data: MarkerPoint[] = [];
  for (const r of rows) {
    try {
      const trigMgDl = parseFloat(
        normalizeUnits(
          { value: String(r.t_value), unit: r.t_unit },
          "mg/dL",
        ).value,
      );
      const hdlMgDl = parseFloat(
        normalizeUnits(
          { value: String(r.h_value), unit: r.h_unit },
          "mg/dL",
        ).value,
      );
      if (!Number.isFinite(trigMgDl) || !Number.isFinite(hdlMgDl) || hdlMgDl === 0)
        continue;
      const ms = new Date(r.date).getTime();
      if (!Number.isFinite(ms)) continue;
      data.push({ ms, value: trigMgDl / hdlMgDl });
    } catch {
      // skip
    }
  }
  if (data.length === 0) return null;
  data.sort((a, b) => a.ms - b.ms);
  const latest = data[data.length - 1].value;
  return {
    id: spec.id,
    name: spec.name,
    unit: spec.unit,
    derived: spec.derived,
    color: spec.color,
    zoneTop: spec.zoneTop,
    zoneMid: spec.zoneMid,
    zoneBottom: spec.zoneBottom,
    yMin: spec.yMin,
    yMax: spec.yMax,
    latest,
    status: classifyStatus(spec, latest),
    data,
    rangeRows: spec.rangeRows,
  };
}

function normalizeCategory(raw: string): EventCategory | null {
  const c = raw.trim().toLowerCase();
  if ((KNOWN_CATEGORIES as string[]).includes(c)) return c as EventCategory;
  return null;
}

async function fetchEvents(userId: number): Promise<{
  events: EventItem[];
  clusters: Cluster[];
  categoriesPresent: EventCategory[];
}> {
  const { prisma } = await openDatabase();
  const dbEvents = await prisma.event.findMany({
    where: { user_id: userId },
    orderBy: { start_date: "asc" },
  });

  const items: EventItem[] = [];
  for (const ev of dbEvents) {
    const category = normalizeCategory(ev.category);
    if (!category) continue;
    const startMs = ev.start_date.getTime();
    const endMs = ev.end_date?.getTime();
    if (endMs && Number.isFinite(endMs) && endMs > startMs) {
      const pairId = `pair-${ev.id}`;
      items.push({
        id: String(ev.id),
        key: `ev-${ev.id}-start`,
        date: startMs,
        endDate: endMs,
        category,
        title: ev.title,
        pairKind: "start",
        pairId,
      });
      items.push({
        id: String(ev.id),
        key: `ev-${ev.id}-stop`,
        date: endMs,
        // endDate carries the *other* bound of the pair so either half can
        // render a full-range tooltip without looking the sibling up.
        endDate: startMs,
        category,
        title: ev.title,
        pairKind: "stop",
        pairId,
        hideLabel: true,
      });
    } else {
      items.push({
        id: String(ev.id),
        key: `ev-${ev.id}`,
        date: startMs,
        category,
        title: ev.title,
        pairKind: "point",
      });
    }
  }

  const { clusters, looseEvents } = buildClusters(items, {
    windowDays: 21,
    threshold: 3,
  });

  const categoriesPresent = Array.from(
    new Set(items.map((e) => e.category)),
  ) as EventCategory[];

  return { events: looseEvents, clusters, categoriesPresent };
}

async function buildDashboardData(userId: number): Promise<DashboardData> {
  const [
    glucose,
    insulin,
    homair,
    hba1c,
    totalCholesterol,
    triglycerides,
    ldl,
    hdl,
    trigHdl,
    creatinine,
    urea,
    uricAcid,
    ast,
    alt,
    ggt,
    alkPhos,
    totalBilirubin,
    hemoglobin,
    hematocrit,
    wbc,
    platelets,
    ferritin,
    vitaminB12,
    testosterone,
    freeT,
    bioavailT,
    estradiol,
    fsh,
    lh,
    prolactin,
    tsh,
    freeT4,
    totalT3,
    cortisol,
    eventBundle,
  ] = await Promise.all([
    fetchSimpleMarker(userId, MARKER_SPECS.glucose, "glucose", "mg/dL", [
      "minutes",
      "urine",
      "fasting",
    ]),
    fetchSimpleMarker(userId, MARKER_SPECS.insulin, "insulin", "µUI/mL", [
      "minutes",
    ]),
    fetchHomaIR(userId),
    fetchSimpleMarker(userId, MARKER_SPECS.hba1c, "hemoglobin a1c", "%"),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.total_cholesterol,
      "Total Cholesterol",
      "mg/dL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.triglycerides,
      "triglycerides",
      "mg/dL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.ldl,
      "LDL Cholesterol",
      "mg/dL",
    ),
    fetchSimpleMarker(userId, MARKER_SPECS.hdl, "hdl cholesterol", "mg/dL", [
      "non-hdl",
      "ratio",
    ]),
    fetchTrigHdlRatio(userId),
    // Urine creatinine (2024-12-02, 114.3 mg/dL) contains "Creatinine".
    fetchSimpleMarker(userId, MARKER_SPECS.creatinine, "Creatinine", "mg/dL", [
      "urine",
    ]),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.urea,
      ["Uremia", "Urea"],
      "mg/dL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.uric_acid,
      ["Uric Acid", "Uricemia"],
      "mg/dL",
    ),
    fetchSimpleMarker(userId, MARKER_SPECS.ast, "AST", "U/L"),
    fetchSimpleMarker(userId, MARKER_SPECS.alt, "ALT", "U/L"),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.ggt,
      ["GGT", "Gamma-GT", "Gamma GT"],
      "U/L",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.alkaline_phosphatase,
      "Alkaline Phosphatase",
      "U/L",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.total_bilirubin,
      "Total Bilirubin",
      "mg/dL",
    ),
    fetchSimpleMarker(userId, MARKER_SPECS.hemoglobin, "Hemoglobin", "g/dL", [
      "urine",
      "a1c",
      "mean corpuscular",
    ]),
    fetchSimpleMarker(userId, MARKER_SPECS.hematocrit, "Hematocrit", "%"),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.wbc,
      "White Blood Cells",
      "K/µL",
    ),
    fetchSimpleMarker(userId, MARKER_SPECS.platelets, "Platelets", "K/µL"),
    fetchSimpleMarker(userId, MARKER_SPECS.ferritin, "Ferritin", "ng/mL"),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.vitamin_b12,
      "Vitamin B12",
      "pg/mL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.testosterone,
      "Total Testosterone",
      "ng/mL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.free_testosterone,
      "Free Testosterone",
      "pg/mL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.bioavailable_testosterone,
      "Bioavailable Testosterone",
      "ng/mL",
    ),
    fetchSimpleMarker(userId, MARKER_SPECS.estradiol, "Estradiol", "pg/mL"),
    fetchSimpleMarker(userId, MARKER_SPECS.fsh, "FSH", "µUI/mL"),
    fetchSimpleMarker(userId, MARKER_SPECS.lh, "Luteinizing", "µUI/mL"),
    fetchSimpleMarker(userId, MARKER_SPECS.prolactin, "Prolactin", "ng/mL", [
      "macroprolactin",
    ]),
    fetchSimpleMarker(userId, MARKER_SPECS.tsh, "TSH", "µUI/mL", ["antibod"]),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.free_t4,
      "Free Thyroxine",
      "ng/dL",
    ),
    fetchSimpleMarker(
      userId,
      MARKER_SPECS.total_t3,
      "Total Triiodothyronine",
      "ng/mL",
    ),
    fetchSimpleMarker(userId, MARKER_SPECS.cortisol, "Cortisol", "µg/dL"),
    fetchEvents(userId),
  ]);

  const markers = [
    // Metabolic & blood sugar
    glucose,
    insulin,
    homair,
    hba1c,
    // Lipids
    totalCholesterol,
    triglycerides,
    ldl,
    hdl,
    trigHdl,
    // Kidney
    creatinine,
    urea,
    uricAcid,
    // Liver
    ast,
    alt,
    ggt,
    alkPhos,
    totalBilirubin,
    // Blood count (hidden by default — see DEFAULT_HIDDEN_CATEGORIES)
    hemoglobin,
    hematocrit,
    wbc,
    platelets,
    // Nutrients
    ferritin,
    vitaminB12,
    // Hormones — sex first, then thyroid axis, then adrenal
    testosterone,
    freeT,
    bioavailT,
    estradiol,
    fsh,
    lh,
    prolactin,
    tsh,
    freeT4,
    totalT3,
    cortisol,
  ].filter((m): m is Marker => m !== null);

  // Timeline range = union of all marker dates and all event dates
  const allTimes: number[] = [];
  for (const m of markers) for (const p of m.data) allTimes.push(p.ms);
  for (const e of eventBundle.events) allTimes.push(e.date);
  for (const c of eventBundle.clusters)
    for (const e of c.events) allTimes.push(e.date);

  const timelineEnd = allTimes.length ? Math.max(...allTimes) : Date.now();
  const timelineStart = allTimes.length ? Math.min(...allTimes) : timelineEnd - 365 * 86400000;

  // Pad the timeline by 2% on each side for breathing room
  const span = timelineEnd - timelineStart;
  const paddedStart = timelineStart - span * 0.02;
  const paddedEnd = timelineEnd + span * 0.02;

  const denseRegions = denseRegionsFromClusters(eventBundle.clusters, 3);

  // Latest sample = newest marker reading
  const latestSampleMs =
    markers.length > 0
      ? Math.max(...markers.map((m) => m.data[m.data.length - 1].ms))
      : null;

  // Quick-filter counts ignore markers whose category is hidden by default
  // (e.g., Blood Count). The category counts themselves still reflect the
  // true total so the sidebar entry remains discoverable.
  const defaultVisible = markers.filter(
    (m) =>
      !DEFAULT_HIDDEN_CATEGORIES.includes(
        MARKER_CATEGORIES[m.id] ?? "metabolic",
      ),
  );
  const outOfRange = defaultVisible.filter(
    (m) => m.status === "Borderline" || m.status === "High" || m.status === "Low",
  ).length;
  const derivedCount = defaultVisible.filter((m) => m.derived).length;

  // Compute improving / worsening / most-changed from the spec + last two
  // readings. Using the spec lets us classify both endpoints with the same
  // status logic the dashboard renders.
  const STATUS_RANK: Record<MarkerStatus, number> = {
    Optimal: 4,
    Good: 3,
    Borderline: 2,
    High: 1,
    Low: 1,
  };
  const improving: string[] = [];
  const worsening: string[] = [];
  const mostChanged: string[] = [];
  for (const m of defaultVisible) {
    if (m.data.length < 2) continue;
    const spec = MARKER_SPECS[m.id];
    if (!spec) continue;
    const latest = m.data[m.data.length - 1].value;
    const previous = m.data[m.data.length - 2].value;
    const latestRank = STATUS_RANK[classifyStatus(spec, latest)];
    const previousRank = STATUS_RANK[classifyStatus(spec, previous)];
    if (latestRank > previousRank) improving.push(m.id);
    else if (latestRank < previousRank) worsening.push(m.id);

    if (previous !== 0) {
      const relChange = Math.abs(latest - previous) / Math.abs(previous);
      if (Number.isFinite(relChange) && relChange >= 0.15) {
        mostChanged.push(m.id);
      }
    }
  }

  const markerCategoryCounts = MARKER_CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = markers.filter((m) => MARKER_CATEGORIES[m.id] === cat).length;
      return acc;
    },
    {} as Record<MarkerCategory, number>,
  );

  return {
    markers,
    events: eventBundle.events,
    clusters: eventBundle.clusters,
    denseRegions,
    categoriesPresent: eventBundle.categoriesPresent,
    timelineStart: paddedStart,
    timelineEnd: paddedEnd,
    latestSampleMs,
    sidebarCounts: {
      all: defaultVisible.length,
      outOfRange,
      derived: derivedCount,
      raw: defaultVisible.length - derivedCount,
      improving: improving.length,
      worsening: worsening.length,
      mostChanged: mostChanged.length,
    },
    markerCategoryCounts,
    trendIds: { improving, worsening, mostChanged },
  };
}

export default async function Home() {
  const userId = 1;
  const data = await buildDashboardData(userId);
  return <Dashboard data={data} />;
}

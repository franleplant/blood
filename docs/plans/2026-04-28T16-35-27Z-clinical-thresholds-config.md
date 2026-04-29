# Plan: Extract clinical thresholds out of `page.tsx`

## Problem

`src/app/page.tsx` currently hardcodes a `MARKER_SPECS` map with clinical reference values for every charted marker:

- `yMin` / `yMax` — chart axis bounds
- `optimalMin` / `optimalMax` — green band, status "Optimal"
- `borderlineMax` / `borderlineMin` — amber band, status "Borderline"
- `higherIsBetter` — inverts the bands for HDL-C
- `color`, `zoneTop/Mid/Bottom` — visual styling tied to the threshold bands

Same numbers (or close cousins) live in `src/components/<Marker>ChartClient.tsx` `referenceLines`. The duplication has already drifted between the two surfaces.

## Goal

One source of truth for marker thresholds + visuals. The dashboard, the legacy per-marker charts, and any future surface (PDF report, lab ingest validator) all read from the same place.

## Approach

Static TypeScript config, **not** a DB table — these values are clinical domain knowledge that change when guidelines change, not per-user. A migration round-trip per tweak is overkill, code review is the right gate.

### File: `src/lib/marker-specs.ts`

Exports a `MARKER_SPECS` map keyed by marker id. Each entry covers everything both the new dashboard and the legacy charts need:

```ts
export type MarkerSpec = {
  id: string;
  name: string;
  /** What `marker_name_en` LIKE patterns to load. */
  searchTerm: string;
  excludePatterns: string[];     // e.g. ["minutes", "non-hdl"]
  targetUnit: "mg/dL" | "%" | "µUI/mL" | ...;
  derived: boolean;
  // Clinical
  optimalMin: number;
  optimalMax: number;
  borderlineMin?: number;        // for higherIsBetter markers
  borderlineMax?: number;        // for lowerIsBetter markers
  higherIsBetter?: boolean;
  // Display
  yMin: number;
  yMax: number;
  color: string;
  zoneTop: string;
  zoneMid: string;
  zoneBottom: string;
};
```

`HOMA-IR` keeps its own loader function (SQL join on glucose+insulin) but reads thresholds from the same map.

### Migrate call sites

- `src/app/page.tsx` — drops its inline `MARKER_SPECS`, imports from `@/lib/marker-specs`. `fetchSimpleMarker` becomes a generic loader that takes a `MarkerSpec`.
- Each `src/components/<Marker>ChartClient.tsx` — replaces hardcoded `referenceLines` with values pulled from the same map. The Recharts chart is still per-component (different shapes), but the **numbers** come from one place.
- Add a unit test (or just a runtime `zod.parse` at module load) that asserts every spec has consistent thresholds: `yMin ≤ optimalMin ≤ optimalMax ≤ yMax`, etc.

### Status classification

`classifyStatus(spec, value)` lives next to `MarkerSpec` in `marker-specs.ts`. Single function, used by the dashboard and any future surface.

## Out of scope

- Per-user reference ranges (we'd need a `user_reference_ranges` table — not worth it for one user).
- Reading `lab_results.reference_range` text. It's noisy free-text from the lab and already doesn't drive any logic; revisit only if the labs become the source of truth.

## Verification

- Dashboard at `/` renders identically before/after the refactor (same status colors, same Y-axis bounds).
- Per-marker charts at `/data` (or wherever they still live) match.
- Run `npm run lint` + `npm run build`.

## Effort

~1 hour. Mostly mechanical — moving constants around and threading one import.

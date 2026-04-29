# Plan: Compute Favorites / Improving / Worsening / Most Changed counts

## Problem

The sidebar's Quick Filters list shows four entries with hardcoded `count: 0`:

- **Favorites** — schema has no favorite flag.
- **Improving** — no trend analysis.
- **Worsening** — no trend analysis.
- **Most Changed** — no change-magnitude analysis.

`All Markers / Out of Range / Derived Markers / Raw Markers` are real (computed in `src/app/page.tsx`).

## Decision summary

| Filter | Action |
| --- | --- |
| Favorites | Drop until we have a use case — no UI to mark a favorite anyway |
| Improving | Compute from the loaded markers |
| Worsening | Compute from the loaded markers |
| Most Changed | Compute from the loaded markers |

Reasoning: trends are derivable from data already in scope; favorites need both a write surface and a storage decision and the user hasn't asked for either.

## Approach

### Drop Favorites

Remove the row from the sidebar in `src/app/Dashboard.tsx`. No DB change. If we want it later, it's a `lab_result_favorites` table keyed by `(user_id, marker_name_en)` plus a star button on each row.

### Compute trends in `page.tsx`

Add a server-side helper alongside `buildDashboardData`:

```ts
type MarkerTrend = "improving" | "worsening" | "stable";

function classifyTrend(marker: Marker): MarkerTrend {
  const window = marker.data.slice(-6);   // last ~6 readings
  if (window.length < 3) return "stable";
  // Linear regression slope over the window, normalized by the
  // marker's optimal-range width so units are comparable.
  const slope = leastSquaresSlope(window);
  const optimalSpan = spec.optimalMax - spec.optimalMin;
  const normalized = slope / Math.max(optimalSpan, 1e-6);

  // "Improving" = moving toward the optimal band. Direction depends
  // on whether the marker is currently above, below, or inside the band,
  // and on `higherIsBetter`.
  // ...
}
```

Direction-of-good logic, by marker state:

- Above optimal range → improving = decreasing slope (negative).
- Below optimal range → improving = increasing slope (positive).
- Inside optimal range → stable unless slope magnitude exceeds a threshold *and* points outside the band → worsening.
- `higherIsBetter` markers (HDL) flip the sign.

Threshold for "stable" vs "trending": `|normalized| < 0.05` (5% of the optimal range per reading) → stable. Tunable.

### Most Changed

Rank by the **z-score** of the latest value against the marker's own historical mean & stdev. Top 25% of markers by `|z|` count as "most changed."

```ts
function isMostChanged(marker: Marker): boolean {
  if (marker.data.length < 5) return false;
  const values = marker.data.map(p => p.value);
  const mean = avg(values);
  const std  = stdev(values, mean);
  if (std === 0) return false;
  const z = Math.abs((marker.latest - mean) / std);
  return z > Z_THRESHOLD;   // start at 1.5
}
```

Tune `Z_THRESHOLD` until ~25% of markers light up — calibrate once we wire in more than 6 markers.

### Wire the counts

Extend `SidebarCounts`:

```ts
type SidebarCounts = {
  all: number;
  outOfRange: number;
  derived: number;
  raw: number;
  improving: number;
  worsening: number;
  mostChanged: number;
};
```

`Dashboard.tsx` reads them directly. Filter rows for Improving / Worsening / Most Changed render the real number.

### (Optional) Make the filters actually filter

Right now clicking a sidebar entry only toggles the highlight — the marker list doesn't change. If we want clicking "Improving" to hide the rest, that's a follow-up: tag each marker with its trend in `DashboardData.markers[i].trend` and apply the filter in `Dashboard.tsx`. Out of scope for this plan unless you want it.

## Out of scope

- Persisting trend windows to the DB. Recompute on every page load — there are at most a few dozen markers and a few hundred points.
- A Worsening alerting / notification surface. Just the count, for now.

## Verification

- Manual: with current data, HbA1c shows 5.7 (Borderline). Slope across the last 4 readings (5.7 → 5.62 → 5.7 → 5.7) is ~flat; trend should classify as "stable", not "worsening". Triglycerides drifting downward (101 → 64 → 53 → 74 → 78 → 92 → 59) is closer to "improving" against an upper threshold of 100.
- Add a small `markers.test.ts` with synthetic point sets covering each direction.
- Snapshot the sidebar — counts should be > 0 for at least one of {Improving, Worsening, Most Changed} given the seeded data.

## Effort

~2 hours. Half the time is calibrating thresholds; the math itself is small.

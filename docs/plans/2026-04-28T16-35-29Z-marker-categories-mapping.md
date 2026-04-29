# Plan: Populate the Categories sidebar (Metabolic / Blood Sugar / Lipids / Hormones)

## Problem

The sidebar's "Categories" section in `src/app/Dashboard.tsx` lists four entries with hardcoded `count: 0`:

- Metabolic
- Blood Sugar
- Lipids
- Hormones

`lab_results` has no `category` column for markers. `Event.category` is for life events, not lab markers. There's no DB-side mapping from a marker name to a clinical category.

## Approach

A name-pattern map in code. Marker categorization is clinical taxonomy, not user-editable data — same reasoning as the threshold-config plan: code is the right surface.

### File: `src/lib/marker-categories.ts`

```ts
export type MarkerCategory =
  | "metabolic"
  | "blood-sugar"
  | "lipids"
  | "hormones"
  | "liver"
  | "kidney"
  | "thyroid"
  | "inflammation"
  | "vitamins"
  | "cbc"
  | "other";

type Rule = { category: MarkerCategory; patterns: RegExp[] };

// Order matters: first match wins.
const RULES: Rule[] = [
  {
    category: "blood-sugar",
    patterns: [
      /glucose/i, /insulin/i, /hba1c|hemoglobin a1c/i,
      /homa-?ir/i, /fructosamine/i,
    ],
  },
  {
    category: "lipids",
    patterns: [
      /cholesterol/i, /triglycerid/i, /ldl/i, /hdl/i, /vldl/i,
      /apolipoprotein/i, /atherogenic/i, /lipoprotein/i,
    ],
  },
  {
    category: "hormones",
    patterns: [
      /testosterone/i, /estradiol|estrogen/i, /tsh|thyroid/i,
      /t3|t4/i, /cortisol/i, /dhea/i, /lh\b|fsh\b|prolactin/i,
      /progesterone/i,
    ],
  },
  {
    category: "metabolic",
    patterns: [
      /uric acid|uricemia/i, /creatinine/i, /urea|bun/i,
      /albumin/i, /sodium|potassium|chloride|calcium|magnesium/i,
    ],
  },
  // ...the rest of the project's 189 distinct marker names.
];

export function categorize(markerNameEn: string): MarkerCategory {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(markerNameEn))) {
      return rule.category;
    }
  }
  return "other";
}
```

Coverage target: every `marker_name_en` currently in `lab_results` resolves to something other than `other`. Generate the initial rule set by iterating the distinct marker list (`SELECT DISTINCT marker_name_en FROM lab_results`) and bucketing each one. Commit a snapshot of the bucketing in `docs/markers-by-category.md` so future changes are reviewable.

### Surface in `page.tsx`

In `buildDashboardData`, query distinct `marker_name_en` for the user, run each through `categorize`, and tally. Pass the result through `DashboardData.sidebarCounts.categories`:

```ts
type SidebarCounts = {
  all: number;
  outOfRange: number;
  derived: number;
  raw: number;
  categories: Record<MarkerCategory, number>;
};
```

`Dashboard.tsx` renders the four UI categories from those counts. Showing the other categories (`liver`, `kidney`, `thyroid`, ...) is a follow-up if/when we expand the sidebar — the data plumbing is the same.

### Optional: write the category back to the DB

If we ever want to filter or query by category on the SQL side, add a non-null `category` column on `lab_results` and backfill it from the same `categorize` function via a script. Not needed for the sidebar count surface; only worth it once a feature actually queries by category.

## Out of scope

- Per-user custom categories.
- Pulling categories from the lab CSVs (they don't carry one).
- Hiding the four UI categories that have zero markers — leave them for now, revisit when the sidebar grows.

## Verification

- A small unit test: feed in a representative ~20 marker names, assert each resolves to the expected category.
- Manual: open `/`. Sidebar Categories show non-zero counts for at least Blood Sugar, Lipids, and Hormones given the current DB.
- Sanity script (`scripts/check-marker-categories.ts`) that prints any name that falls into `other` — fail loudly during dev so the rules stay current as new markers get ingested.

## Effort

~2 hours. The rule-writing is the work; the plumbing is ~30 lines.

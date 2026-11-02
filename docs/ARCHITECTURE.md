# Architecture

A Next.js 15 dashboard that visualizes longitudinal blood-marker data for one or more users. CSV exports from labs are imported into a local SQLite database via Prisma, then rendered as time-series charts on a single dashboard page.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 18, RSC) |
| Language | TypeScript (run with `tsx` for scripts; Node ≥ 24) |
| Database | SQLite, file-based (`blood_markers.sqlite`) |
| ORM | Prisma 6 (client emitted to `src/generated/prisma`) |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| UI | Tailwind v4, shadcn/ui primitives (Radix slot), `lucide-react` |
| Validation | Zod (declared dependency, used at boundaries) |
| CSV parsing | `csv-parse`, `papaparse` |

## Repository layout

```
.
├── schema.prisma                # Prisma schema (User, LabResult, Event)
├── migrations/                  # Prisma migration history (4 migrations)
├── blood_markers.sqlite         # SQLite database (committed; dev convenience)
├── historiclabdata.csv          # Primary marker import source
├── historiclabdata_2025-10-28_from_pdfs.csv  # Secondary batch (PDF-extracted)
├── users.csv                    # Users seed
├── events.csv                   # Life/medication events seed
├── src/
│   ├── app/                     # Next.js App Router (single dashboard page)
│   ├── components/              # Chart pairs + MarkersTable + shadcn/ui
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── normalize_units.ts   # All unit conversions
│   │   └── utils.ts             # `cn` Tailwind class merger
│   ├── scripts/                 # CLI import / normalization scripts
│   └── generated/prisma/        # Generated Prisma client (gitignored output dir)
├── .rules/                      # Cursor / coding-style rules
└── public/                      # Static assets
```

## Data model

Defined in `schema.prisma`. Three tables, all keyed to a `User`:

- **User** — `id` (autoinc), `name`, optional `height`, `gender`. Anchors all per-user queries.
- **LabResult** — UUID id, `date` (TEXT, parsed at read time), bilingual marker names (`marker_name_es`, `marker_name_en`), `value` (TEXT — values can be `"<5"`, comma-decimal, etc.), optional `unit`, `reference_range`, `lab_name`, `doctor_protocol_notes`, `derived`, `comments`, `other`, `user_id` FK.
- **Event** — autoinc id, `DateTime`, `title`, `description`, `user_id` FK. Used to overlay life events (e.g. medication starts) on charts.

Notes that drive the rest of the architecture:

- `LabResult.value` and `LabResult.unit` are deliberately strings. Values arrive from heterogeneous lab CSVs containing `<` prefixes, comma decimal separators, and unit variants (`mg/dL` vs `g/L`, `µUI/mL` vs `mU/ml`, etc.). Normalization happens at *read* time, not at import time, so the raw CSV is preserved as ground truth.
- `LabResult.date` is stored as TEXT (Prisma `String`) and parsed with `new Date(...)` in queries — Prisma's SQLite provider doesn't enforce date validity here.

## Migration history

Located in `migrations/`. Four migrations bring the schema to its current shape:

1. `20250701155258_lab_results` — initial `lab_results` table.
2. `20250701155318_add_events_table` — `events` table.
3. `20250701164519_add_users_table_and_relations` — adds `users`, backfills a "Default User" (id=1), and rewrites `lab_results` / `events` with `user_id` FKs.
4. `20250701173644_change_event_date_to_datetime` — promotes `Event.date` from TEXT to `DateTime`.

The `user_id = 1` default established in migration 3 is why scripts default to `USER_ID=1` and the dashboard hardcodes `userId = 1`.

## Application flow

### Single dashboard page

`src/app/page.tsx` is a Server Component that:

1. Computes a global `dateRange` (oldest / newest `LabResult.date` for the user) so every chart can share a uniform x-axis.
2. Renders one card per marker chart plus a paginated `MarkersTable` of all raw lab results.

User identity is currently hardcoded (`const userId = 1`). There is no auth layer — this is a personal-use tool.

### Chart pair pattern

Every marker chart is split into two files in `src/components/`:

- `XChart.tsx` — async **Server Component**. Opens Prisma, queries `LabResult` (and sometimes `Event`) for `userId`, normalizes units via `normalizeUnits(...)`, and passes plain serializable data to its client counterpart. If no data, renders an empty-state message and returns early.
- `XChartClient.tsx` — `"use client"` **Recharts** component. Receives `data`, `events`, and the shared `dateRange`, builds a Recharts `ComposedChart` / `LineChart`, overlays event markers (e.g. medication starts) as a `Scatter`, and draws reference lines for clinical thresholds.

Charts currently implemented: `Glucose`, `HemoglobinA1c`, `HomaIR`, `TriglyceridesHDLRatio`, `UricAcid`, `LiverEnzymes` (AST/ALT/GGT combined), `TotalTestosterone`, `Estradiol`, `TSH`.

A few charts are non-trivial:

- **HomaIRChart** runs a raw SQL `JOIN` to pair same-day glucose and insulin readings, then computes `HOMA-IR = glucose(mg/dL) × insulin(µUI/mL) / 405`. Rows with mismatched insulin units are skipped with a warning rather than dropped silently.
- **LiverEnzymesChart** fans out to AST, ALT, GGT and *transposes* into per-date rows so all three lines share one Recharts dataset.
- **UricAcidChart** still queries both "Uric Acid" and "Uricemia". The committed database stores the whole series as `Uricemia` (`npm run db:canonicalize-markers`); the extra search term only covers a row the rename has not seen.

### MarkersTable

`src/components/MarkersTable/` is a TanStack Table v8 view of every `LabResult` row (server-fetched) with client-side filtering on `marker_name_en`, sortable date/marker/value columns, and a 1000-row page size. Built on the `Table`, `Button`, `Input` shadcn/ui primitives in `components/ui/`.

### Database access

`src/lib/db.ts` exports `openDatabase()`, which lazily creates a single `PrismaClient` and stashes it on `globalThis`. This is the standard Next.js dev-server pattern to avoid exhausting connections during HMR. The returned object also exposes `Symbol.asyncDispose` so callers can use `await using { prisma } = await openDatabase()` — the `.rules/use-sqlite-package.md` codifies this preference, though most call sites currently destructure `prisma` directly.

## Unit normalization

`src/lib/normalize_units.ts` is the single place that converts between unit dialects. Public API:

```ts
normalizeUnits({ value, unit }, targetUnit): { value, unit }
```

Supported `targetUnit` values: `"mg/dL" | "%" | "U/L" | "ng/mL" | "pg/mL" | "µUI/mL"`.

Worth knowing:

- `parseValue` strips a leading `<` (e.g. `"<5"` → `5`) and rewrites `,` → `.` so European decimal separators don't NaN out.
- Glucose: accepts `mg/dL`, `mg %`, `g/L`, `gr/lt`, `gr o/oo`. Anything else throws.
- HbA1c: accepts `%` directly; converts `mmol/mol` via `× 0.0915 + 2.15` (NGSP/IFCC equivalence).
- `µUI/mL`: tolerates the case-folded variants the underlying lowercasing produces (`µui/ml`, `uui/ml`, `mui/ml`, `µu/ml`, `uu/ml`, `mu/ml`).
- Errors are thrown by design — chart server components catch them per-row, log a warning, and drop the row, rather than silently emitting wrong numbers.

A separate `src/scripts/normalize_glucose_units.ts` exists to **persist** normalized values back into the database for glucose specifically. It is not part of the runtime request path.

## CSV ingestion pipeline

CSVs are the source of truth; the database is rebuilt from them. Scripts live in `src/scripts/` and are wired up in `package.json` as `db:*`:

| Script | npm alias | Purpose |
| --- | --- | --- |
| `import-markers.ts` | `db:import-markers` | Imports `historiclabdata.csv` into `lab_results`. Builds a `temp_lab_results` table programmatically, bulk-loads via the `sqlite3` CLI's `.import`, then `INSERT … SELECT` into the final table tagging rows with `USER_ID` (env, default 1). Destructive: assumes empty / append-only target. |
| `import-markers-safe.ts` | `db:import-markers-safe <csv>` | Same shape, but: (a) takes the CSV path as an argument, (b) uses programmatic `INSERT` instead of the CLI, (c) **deduplicates** via `LEFT JOIN` on `(date, marker_name_en, value, user_id)` with temporary indexes for speed. Used for incremental imports of new CSV batches. |
| `import-users.ts` | `db:import-users` | Reads `users.csv`, upserts each row by id through Prisma. |
| `import-events.ts` | `db:import-events` | Pipes `events.csv` straight into the `events` table via `sqlite3 .import`. |
| `normalize-decimal-separators.ts` | `db:normalize-decimals` | One-off cleanup: rewrites `,` → `.` in any `LabResult.value` that looks like a decimal. |
| `add-ids-to-csv.ts` | (not aliased) | Stamps a UUID `id` column onto the lab CSVs in place. Run once per new CSV before importing. |
| `normalize_glucose_units.ts` | (not aliased) | Re-reads glucose rows, runs them through `normalizeUnits(..., "mg/dL")`, and writes the normalized value+unit back. |

Prisma's own scripts (`db:generate`, `db:migrate`, `db:studio`, `db:reset`, …) round out the workflow.

### Typical bootstrap

```bash
npm install
npm run db:migrate          # applies migrations/, creates blood_markers.sqlite
npm run db:import-users     # seed users
npm run db:import-markers   # bulk-load primary CSV
npm run db:import-events    # life events
npm run dev                 # http://localhost:3000
```

For incremental ingestion of a new lab dump:

```bash
tsx src/scripts/add-ids-to-csv.ts          # stamp UUIDs (idempotent)
npm run db:import-markers-safe historiclabdata_<date>.csv
```

## Build & deploy

- `npm run dev` — Next dev server.
- `npm run build` — `prisma generate && next build`. Generation is in `prebuild` because the Prisma client is written into `src/generated/prisma` and committed-but-rebuilt-per-build artifacts have to be present before TS compilation.
- `npm run start` — production Next server.
- `npm run lint` — ESLint via `eslint-config-next`.

`DATABASE_URL` is read from the environment (e.g. `file:./blood_markers.sqlite`); the SQLite file is committed for development convenience.

## Conventions (`.rules/`)

Project-specific conventions enforced by the Cursor rules — apply them when editing:

- `use-native-typescript-runner.md` — run TS with `tsx` (or Node's native loader); no `ts-node`, no separate compile step.
- `use-sqlite-package.md` — for raw SQLite access in scripts, use the `sqlite` package wrapping `sqlite3`, with `await using` for disposal. (Application code now uses Prisma; this rule still governs the import scripts.)
- `prefer-array-t.md` — `Array<T>` over `T[]`.
- `no-toplevel-arrow-functions.md` — top-level definitions are `function` declarations, not arrow assignments.
- `react-props-interface-naming.md` — component props live in a local `interface Props { … }`.

## Cross-cutting concerns

- **Bilingual marker names.** Lab data lands as Spanish-named markers translated to English (`marker_name_es`/`marker_name_en`). Queries match on the English column with `contains` filters. Aliases of the same analyte are collapsed by `src/scripts/canonicalize-marker-names.ts`; chart searches still include the old string where a missed alias would otherwise drop off the series (uric acid still matches `Uricemia` and `Uric Acid`).
- **Unit drift.** Same marker arrives with different units across labs and years. Normalization is centralized in `normalize_units.ts` and applied per-chart at read time. Adding a new chart almost always means extending one of the `toX` helpers there.
- **Date axis alignment.** The dashboard computes a single `dateRange` once and passes it to every chart so they share an x-axis — without it, charts with sparse data drew on different domains and looked misleading.
- **Single-user assumption today, schema ready for multi-user.** Every table has `user_id`; only the dashboard's hardcoded `userId = 1` blocks multi-user UI.

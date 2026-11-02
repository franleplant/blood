# Lab Ingestion Workflow

How new blood-work results get from a PDF/text/screenshot into the SQLite database, and how to know what's already been processed.

> The original lab files in `raw/` are personal medical records. They're committed to keep the pipeline reproducible — strip them before forking the repo.

## Layout

```
docs/labs/
├── README.md          # this file
├── INGESTED.md        # log of every batch that has hit the DB (latest first)
├── INGEST_PROMPT.md   # the prompt fed to `claude -p` to run the workflow
├── raw/               # untouched originals: PDFs, text dumps, screenshots, etc.
└── extracted/         # CSVs in lab_results schema, ready for db:import-markers-safe
```

`raw/` and `extracted/` use the same filename stem so a batch is easy to track:

- `raw/2026-04-15__hospital-italiano.pdf`
- `extracted/2026-04-15__hospital-italiano.csv`

Filename convention: `<YYYY-MM-DD>__<lab-or-source-slug>.<ext>` where the date is the **collection date** on the report, not the day you imported it.

## Adding a new batch

1. Drop the original into `docs/labs/raw/` using the naming convention above.
2. Run the ingest agent:
   ```
   npm run labs:ingest
   ```
   This is a thin wrapper around `claude -p "$(cat docs/labs/INGEST_PROMPT.md)"`. The agent will:
   - Diff `raw/` against `INGESTED.md` to find unprocessed files.
   - For each: extract markers into `docs/labs/extracted/<stem>.csv` matching the existing lab_results schema.
   - Run `tsx src/scripts/add-ids-to-csv.ts` against the new CSV (stamps UUIDs).
   - Run `tsx src/scripts/import-markers-safe.ts docs/labs/extracted/<stem>.csv` (deduped insert).
   - Append a row to `INGESTED.md`.
3. Sanity-check by opening `npm run dev` and confirming the new dates appear on the relevant charts.

## Checking what's already ingested

```
npm run labs:status      # cat docs/labs/INGESTED.md
```

Or just open `INGESTED.md` — latest batch is at the top.

## Schema reminder

CSVs under `extracted/` must match the `historiclabdata.csv` columns exactly, in this order:

```
id,date,marker_name_es,marker_name_en,value,unit,reference_range,lab_name,doctor_protocol_notes,derived,comments,other
```

Conventions enforced by `INGEST_PROMPT.md`:

- `date` is ISO `YYYY-MM-DD` (matches what `new Date(...)` parses elsewhere).
- `value` and `unit` are stored **as written on the report** — `<5`, `1,23`, `mU/ml`, etc. are all fine. Normalization happens at read time in `src/lib/normalize_units.ts`, not at import.
- `marker_name_en` should reuse names already in the DB whenever the marker matches an existing one (e.g. `Glucose`, `Basal Insulin`, `AST`, `ALT`, `GGT`, `Total Testosterone`, `Estradiol (E2)`, `TSH`, `HDL Cholesterol`, `Triglycerides`, `Uricemia`). The dashboard charts filter on these strings — drift breaks them silently.
- `marker_name_es` is the original Spanish name from the report (or empty if the source is English-only).
- The `id` column can be left blank in `extracted/<stem>.csv`; the workflow runs `add-ids-to-csv.ts` to backfill UUIDs before import.

## Pre-existing data

The two CSVs at the repo root (`historiclabdata.csv`, `historiclabdata_2025-10-28_from_pdfs.csv`) were imported before this workflow existed. They are recorded in `INGESTED.md` for completeness; don't re-import them.

## Canonical English names

`npm run db:canonicalize-markers` renames known aliases of the same analyte onto one `marker_name_en` (the name that already has the most rows). It updates the committed SQLite database and `docs/labs/extracted/*.csv`, and it is safe to run again. It does not edit the root historic CSVs. Those files keep the spellings they were imported with; importing them again after a rename would insert the old names as new rows, because the safe importer dedupes on `(date, marker_name_en, value, user_id)`. Spanish names are left as printed. The map and the cases left unmerged live in `src/scripts/canonicalize-marker-names.ts`.

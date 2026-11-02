# Lab Ingestion Prompt

You are running inside the `blood` repo. Your job is to take any new lab-result files in `docs/labs/raw/` that are not yet recorded in `docs/labs/INGESTED.md`, extract their markers into the project's CSV schema, and import them into the SQLite database.

Work autonomously. Confirm only if you hit something genuinely ambiguous (e.g. a marker you cannot map and that does not exist in the DB).

## Steps

### 1. Find unprocessed files

- List `docs/labs/raw/` (ignore `.gitkeep`).
- Read `docs/labs/INGESTED.md` and parse the `Source file` column.
- The set difference is your work queue. If empty, print "No new lab files to ingest." and stop.

### 2. For each unprocessed file

Process files **one at a time**, in chronological order by the date in the filename.

#### 2a. Read the raw file

- PDFs: use the `Read` tool — it natively reads PDFs. Pass `pages` if it's > 10 pages.
- Text / markdown / CSV originals: `Read` directly.
- Images / screenshots: `Read` (multimodal).
- HTML emails or printouts: `Read`, then ignore boilerplate.

If the source spans multiple visits/dates, treat each visit as its own batch — you'll write one CSV per collection date and append one row per CSV to `INGESTED.md`.

#### 2b. Extract markers to CSV

Output goes to `docs/labs/extracted/<same-stem-as-raw>.csv`, in this exact column order:

```
id,date,marker_name_es,marker_name_en,value,unit,reference_range,lab_name,doctor_protocol_notes,derived,comments,other
```

Rules:

- **`id`**: leave empty. `add-ids-to-csv.ts` will fill UUIDs in step 2c.
- **`date`**: the **collection date** on the report, formatted `YYYY-MM-DD`. Not the report-issued date, not today.
- **`marker_name_es`**: original Spanish name as printed on the report. Empty if the source is English-only.
- **`marker_name_en`**: canonical English name. **Reuse names already in the DB** when possible — the dashboard charts filter with case-insensitive `contains` on these strings, so drift breaks charts silently.

  Before inventing a new name, run:
  ```
  sqlite3 blood_markers.sqlite "SELECT DISTINCT marker_name_en FROM lab_results ORDER BY marker_name_en;"
  ```
  Common canonical names to match (chart-relevant ones bolded by importance):
  - **`Glucose`** (fasting blood glucose; do NOT use `Fasting Glucose` — chart filters on `glucose` but excludes `minutes`)
  - **`Basal Insulin`** or any name containing `Insulin` (HOMA-IR pairs glucose+insulin on same date)
  - `Hemoglobin Glycated` / variants containing `Glycated` (HbA1c)
  - `Triglycerides`, `HDL Cholesterol` (Trig/HDL ratio chart)
  - **`Uricemia`** (uric acid; do not also use `Uric Acid`)
  - `AST`, `ALT`, `GGT` (or `Gamma-Glutamyltransferase (GGT)`)
  - `Total Testosterone`, `Estradiol` (or `Estradiol (E2)`), `TSH`

- **`value`**: **as written on the report**, untouched. Keep `<5`, `>200`, `1,23` (comma decimal), etc. Do **not** normalize, round, or unit-convert here — `src/lib/normalize_units.ts` does that at read time and relies on raw input. The only allowed cleanup is stripping whitespace.
- **`unit`**: as written. Variants like `mg/dl`, `mg/dL`, `mg %`, `g/L`, `µUI/mL`, `mU/ml` are all known to the normalizer. If a marker has no unit on the report (ratios, qualitative findings), leave empty.
- **`reference_range`**: as printed on the report (e.g. `70 - 100`, `<150`). Empty if absent.
- **`lab_name`**: laboratory or institution name on the report (e.g. `Hospital Italiano`, `Hidalgo`). Use a stable spelling.
- **`doctor_protocol_notes`**: prescribing doctor name if present. Empty otherwise.
- **`derived`**: `Yes` if the marker is computed from other markers on the same panel (e.g. LDL by Friedewald, atherogenic index, A/G ratio); `No` otherwise. Empty if uncertain.
- **`comments`** / **`other`**: free-form. Use `comments` for lab-printed notes on the marker; leave `other` empty unless you have something that doesn't fit elsewhere.

CSV escaping: wrap any field containing `,`, `"`, or newline in double quotes; escape `"` as `""`.

If a marker is illegible or ambiguous, **skip it and note it in INGESTED.md `Notes`** rather than guessing.

#### 2c. Stamp UUIDs and import

Run, in order:

```bash
tsx src/scripts/add-ids-to-csv.ts docs/labs/extracted/<stem>.csv
USER_ID=1 npm run db:import-markers-safe -- docs/labs/extracted/<stem>.csv
```

`db:import-markers-safe` deduplicates on `(date, marker_name_en, value, user_id)`, so re-running on the same CSV is idempotent. Capture the `Inserted N new rows` line from its output for the next step.

#### 2d. Append to INGESTED.md

Prepend a row directly under the table header (above existing rows so the latest is on top). Use the format documented in `INGESTED.md`:

```
| <collection date> | docs/labs/raw/<stem>.<ext> | docs/labs/extracted/<stem>.csv | <inserted N> | <user_id> | <UTC ISO timestamp> | <notes> |
```

Get the timestamp via `date -u +%Y-%m-%dT%H:%M:%SZ`.

In `Notes`, mention: lab name, any markers you skipped, and any unfamiliar `marker_name_en` you introduced (so the human can review).

### 3. Final summary

After processing all files, print a short summary: how many batches ingested, total new rows in DB, anything skipped. Do not push, do not commit — leave that to the human.

## Guardrails

- **Never edit** `historiclabdata.csv` or `historiclabdata_2025-10-28_from_pdfs.csv` — they're frozen historical batches.
- **Never** run `db:reset` or `db:import-markers` (the non-safe variant). Use `db:import-markers-safe` only.
- If `import-markers-safe` reports `Skipped N duplicate rows` equal to the row count, that batch was already in the DB — still add it to INGESTED.md (with `0` in the rows column and a `(all duplicates)` note) so the file is recorded as processed.
- If you cannot confidently extract a file (encrypted PDF, illegible scan, unknown language), skip it and report it in the final summary instead of inventing data.

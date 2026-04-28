# Ingested Lab Batches

Append one row per batch when ingesting. **Latest entry on top.** Every row corresponds to a `docs/labs/raw/<stem>.<ext>` original and a `docs/labs/extracted/<stem>.csv` extraction (except the historical bootstrap rows below, which predate this workflow).

| Collection date | Source file | Extracted CSV | Rows | User ID | Ingested at | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-04-22 | docs/labs/raw/2026-04-22__diagnostico-maipu.pdf | docs/labs/extracted/2026-04-22__diagnostico-maipu.csv | 39 | 1 | 2026-04-28T15:19:08Z | Diagnóstico Maipú, Dr. Nanni. Full panel (CBC, glucose+insulin, hepatograma, lipids, T3/T4L/TSH, FSH/LH/prolactin/E2/testo/cortisol). Kept differential percentages only, not absolute counts (matching existing convention). |
| 2026-01-14 | docs/labs/raw/2026-01-14__diagnostico-maipu.pdf | docs/labs/extracted/2026-01-14__diagnostico-maipu.csv | 37 | 1 | 2026-04-28T15:19:08Z | Diagnóstico Maipú, Dr. Aguirre. Full panel except no thyroid. Includes Free Testosterone (calculated). |
| 2025-11-26 | docs/labs/raw/2025-11-26__diagnostico-maipu.pdf | docs/labs/extracted/2025-11-26__diagnostico-maipu.csv | 13 | 1 | 2026-04-28T15:19:08Z | Diagnóstico Maipú, Dr. Aguirre. Hormones + STI screen (Chlamydia/Mycoplasma/Neisseria PCR + urine culture). Skipped urine sediment microscopy detail (pH, aspect, cell counts). E2 50.0 pg/mL flagged "verificado por repetición". |
| 2025-11-19 | docs/labs/raw/2025-11-19__diagnostico-maipu.pdf | docs/labs/extracted/2025-11-19__diagnostico-maipu.csv | 25 | 1 | 2026-04-28T15:19:08Z | Diagnóstico Maipú, Dr. Nanni. Hemogram + serology STI panel. New marker_name_en values introduced: HIV Antigen P24, Hepatitis B Surface Antigen (HBsAg), Hepatitis B Anti-Core Total Antibodies, Hepatitis C Total Antibodies, Herpes Simplex I/II (IgG)/(IgM), VDRL (Qualitative), Treponema Pallidum. Won't show on charts (no chart filters them). |
| 2025-10-28 | docs/labs/raw/2025-10-28__diagnostico-maipu.pdf | `historiclabdata_2025-10-28_from_pdfs.csv` (repo root) | 61 | 1 | pre-workflow | Diagnóstico Maipú, Dr. Aguirre. Imported pre-workflow via `db:import-markers-safe`; original PDF archived to raw/ on 2026-04-28 — confirmed all 61 rows match the PDF, no re-extract needed. |
| (pre-2025-10-28, mixed) | _historical bulk_ | `historiclabdata.csv` (repo root) | 388 | 1 | pre-workflow | Existing baseline imported via `db:import-markers`. |

## Row format for new entries

When `INGEST_PROMPT.md` runs, the agent prepends a row of the form:

```
| YYYY-MM-DD | docs/labs/raw/<stem>.<ext> | docs/labs/extracted/<stem>.csv | <row count> | <user_id> | YYYY-MM-DDTHH:MM:SSZ | <free-form notes, e.g. lab name, missing markers> |
```

Use ISO 8601 UTC for `Ingested at`. Keep `Notes` short — surprises only.

# Ingested Lab Batches

Append one row per batch when ingesting. **Latest entry on top.** Every row corresponds to a `docs/labs/raw/<stem>.<ext>` original and a `docs/labs/extracted/<stem>.csv` extraction (except the historical bootstrap rows below, which predate this workflow).

| Collection date | Source file | Extracted CSV | Rows | User ID | Ingested at | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 | docs/labs/raw/2026-10-06__diagnostico-maipu.pdf | docs/labs/extracted/2026-10-06__diagnostico-maipu.csv | 36 | 1 | 2026-11-02T12:12:02Z | Diagnóstico Maipú, Dr. Aguirre, protocol 17183012. CBC (percentages only), glucose, hepatograma, lipids, amylase, lipase, TSH, FSH/LH/E2/testosterone/free/bioavailable, morning cortisol. No insulin, T3/T4L, or prolactin. LH 11.90 mUI/mL and cortisol 23.6 µg/dL are above the printed reference; stored as printed. |
| 2026-08-20 | docs/labs/raw/2026-08-20__diagnostico-maipu.pdf | docs/labs/extracted/2026-08-20__diagnostico-maipu.csv | 7 | 1 | 2026-11-02T12:12:02Z | Diagnóstico Maipú, Dr. Aguirre, protocol 17176053. FSH, LH, estradiol, total/free/bioavailable testosterone, morning cortisol. |
| 2026-07-15 | docs/labs/raw/2026-07-15__diagnostico-maipu.pdf | docs/labs/extracted/2026-07-15__diagnostico-maipu.csv | 16 | 1 | 2026-11-02T12:12:02Z | Diagnóstico Maipú, Dr. Aguirre, protocol 17171067. Glucose, hepatograma (no HDL/LDL/triglycerides), amylase, lipase, FSH/LH/E2/testosterone. No insulin or thyroid. E2 77.4 pg/mL flagged "verificado por repetición". LH 9.17, total T 12.40, free T 1093.31 pmol/L, and bioavailable T 7.58 are above the printed reference; stored as printed. |
| 2024-12-02 | docs/labs/raw/2024-12-02__diagnostico-maipu.pdf | docs/labs/extracted/2024-12-02__diagnostico-maipu.csv | 66 | 1 | 2026-11-02T12:12:02Z | Diagnóstico Maipú, Dra. Farias, protocol 17099122 (FINAL). CBC percentages only, CRP, glucose, urea, creatinine, uric acid, ionogram, hepatograma, Ca/P/Mg, amylase, B12, urine microalbumin, 25-OH vitamin D, proteinogram, homocysteine, zinc, selenium, full urinalysis. Skipped ACR (not calculated; microalbumin below 12 mg/L) and differential absolute counts. New marker_name_en: Microalbumin, Urine Creatinine, Zinc, Selenium, Bile Pigments, Round Cells. Homocysteine unit printed as µmolL (no slash). Urine specific gravity printed as 1022 mg/ml. |
| 2026-04-22 | docs/labs/raw/2026-04-22__diagnostico-maipu.pdf | docs/labs/extracted/2026-04-22__diagnostico-maipu.csv | 39 | 1 | 2026-04-28T15:19:08Z | Diagnóstico Maipú, Dr. Nanni, protocol 17159570. Full panel (CBC, glucose+insulin, hepatograma, lipids, T3/T4L/TSH, FSH/LH/prolactin/E2/testo/cortisol). Kept differential percentages only, not absolute counts (matching existing convention). 2026-11-02: raw PDF replaced with the FINAL report (adds toenail mycological direct exam + culture). All 39 blood values match the stored rows; 0 new blood rows. Mycological culture not ingested. |
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

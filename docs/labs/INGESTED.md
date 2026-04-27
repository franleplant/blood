# Ingested Lab Batches

Append one row per batch when ingesting. **Latest entry on top.** Every row corresponds to a `docs/labs/raw/<stem>.<ext>` original and a `docs/labs/extracted/<stem>.csv` extraction (except the historical bootstrap rows below, which predate this workflow).

| Collection date | Source file | Extracted CSV | Rows | User ID | Ingested at | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| (pre-2025-10-28, mixed) | _historical bulk_ | `historiclabdata.csv` (repo root) | 388 | 1 | pre-workflow | Existing baseline imported via `db:import-markers`. |
| 2025-10-28 | _PDFs, not committed_ | `historiclabdata_2025-10-28_from_pdfs.csv` (repo root) | 61 | 1 | pre-workflow | Existing batch imported via `db:import-markers-safe`. |

## Row format for new entries

When `INGEST_PROMPT.md` runs, the agent prepends a row of the form:

```
| YYYY-MM-DD | docs/labs/raw/<stem>.<ext> | docs/labs/extracted/<stem>.csv | <row count> | <user_id> | YYYY-MM-DDTHH:MM:SSZ | <free-form notes, e.g. lab name, missing markers> |
```

Use ISO 8601 UTC for `Ingested at`. Keep `Notes` short — surprises only.

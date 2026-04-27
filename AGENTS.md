# AGENTS.md

Index of project documentation for AI coding agents (and humans). Each entry below points to a doc under `docs/`. Add new docs here when you create them.

> `CLAUDE.md` in the repo root is a symlink to this file — Claude Code and other tools that look for `CLAUDE.md` will read this same content.

## Documentation index

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture: stack, data model, migration history, chart pair pattern, unit normalization, CSV ingestion pipeline, and project conventions.
- [docs/labs/README.md](docs/labs/README.md) — Workflow for ingesting new lab results (PDFs/text/screenshots) into the database. See also [`docs/labs/INGESTED.md`](docs/labs/INGESTED.md) (what's already in the DB) and [`docs/labs/INGEST_PROMPT.md`](docs/labs/INGEST_PROMPT.md) (the prompt run by `npm run labs:ingest`).

## Conventions for adding docs

- One topic per file, kebab-case filename, `.md` extension, place under `docs/`.
- Add a one-line entry above with `[docs/<file>](docs/<file>) — <what it covers>`.
- Keep this index short — the *contents* go in the linked file, not here.

# Blood Markers

> Auto-maintained by the platform. Last updated: 2025-01-01
> Describes what this app does. Agents read this before every task.
> You can edit this anytime — your changes are preserved.

## Overview

Blood Markers is a personal health analytics application for tracking and visualizing blood lab results over time. Users import their historical lab data from CSV files into a SQLite database, then explore trends and patterns through a web interface with data tables and charts. The app supports multiple users, tracks life events alongside lab results, and computes derived markers like HOMA-IR.

## Tech Stack

- **Runtime**: Node.js 24 (TypeScript via tsx)
- **Framework**: Next.js 15.3 (App Router, React 18)
- **Database**: SQLite via Prisma ORM 6.11
- **UI**: Tailwind CSS 4, Radix UI, shadcn/ui component patterns, Recharts, TanStack React Table
- **Validation**: Zod
- **CSV Parsing**: PapaParse, csv-parse
- **Package manager**: npm

## Architecture

The app is a Next.js application with a Prisma-backed SQLite database. Data flows from CSV files through import scripts into the database, then is served to the frontend via Next.js server components or API routes.

**Data model**: `User` → has many `LabResult` (blood marker readings with date, marker name in EN/ES, value, unit, reference range, lab info) and `Event` (life events with date, title, description). Lab results store values as strings to accommodate varied formats.

**Import pipeline**: Several `tsx`-based scripts handle importing markers, users, and events from CSV/external sources into SQLite. A decimal normalization script handles locale-specific number formatting.

**Frontend**: Next.js app with Recharts for time-series visualization and TanStack React Table for tabular data display. Uses shadcn/ui-style components (class-variance-authority, clsx, tailwind-merge, lucide-react icons).

### Directory Structure

```
├── schema.prisma              # Prisma schema (SQLite, User/LabResult/Event models)
├── package.json
├── tsconfig.json
├── src/
│   ├── generated/prisma/      # Prisma generated client
│   ├── scripts/
│   │   ├── import-markers.ts      # Import lab markers from CSV
│   │   ├── import-markers-safe.ts # Safe/idempotent marker import
│   │   ├── import-users.ts        # Import users
│   │   ├── import-events.ts       # Import life events
│   │   └── normalize-decimal-separators.ts  # Fix decimal formats
│   └── app/                   # Next.js App Router pages & components
├── .nvmrc                     # Node v24
└── .rules/                    # Cursor AI assistant rules
```

## Features

### CSV Data Import

Imports blood marker lab data from CSV files into SQLite. Supports multiple import scripts including a "safe" idempotent variant and decimal normalization for locale differences.

**Invariants:**
- INVARIANT: Each LabResult has a date, marker_name_es, marker_name_en, and value (all required strings)
- INVARIANT: Every LabResult belongs to a User via user_id foreign key
- INVARIANT: The safe import script can be run multiple times without duplicating data

**Key files:**
- `src/scripts/import-markers.ts` — Primary CSV-to-database import
- `src/scripts/import-markers-safe.ts` — Idempotent import variant
- `src/scripts/normalize-decimal-separators.ts` — Fixes comma/period decimal formats

### Multi-User Support

Supports multiple users, each with their own lab results and life events.

**Invariants:**
- INVARIANT: Each User has a unique auto-incremented integer ID and a required name
- INVARIANT: LabResults and Events are scoped to a specific User

**Key files:**
- `schema.prisma` — Defines User, LabResult, and Event models with relations

### Life Events Tracking

Records significant life events (medications, lifestyle changes, etc.) alongside lab data for correlation.

**Invariants:**
- INVARIANT: Each Event has a required date (DateTime), title, and description
- INVARIANT: Events are associated with a User via user_id

**Key files:**
- `src/scripts/import-events.ts` — Imports life events

### Data Visualization & Tables

Web-based interface for viewing lab results in tables and charts over time using Recharts and TanStack React Table.

**Invariants:**
- INVARIANT: Lab results include bilingual marker names (Spanish and English)
- INVARIANT: Values are stored as strings to preserve original formatting

## Conventions

- Prisma models use `@@map` to snake_case table names (`users`, `lab_results`, `events`)
- Path alias `@/*` maps to `./src/*`
- Import scripts are run via `tsx` (see `db:*` npm scripts)
- UI follows shadcn/ui patterns: components use `class-variance-authority`, `clsx`, and `tailwind-merge`
- Prisma client is generated to `src/generated/prisma/`
- ESM modules (`"type": "module"` in package.json)

## Known Limitations

- Database is SQLite (single-file, not suitable for concurrent multi-user production deployment)
- Lab result values are stored as strings, requiring parsing for numerical analysis
- No authentication or authorization system
- CSV import requires manual script execution (no UI-based import)
- README references scripts/commands (`db:init`, `scripts/plot_homa_ir.ts`) that don't exist in package.json, suggesting some features are planned or outdated
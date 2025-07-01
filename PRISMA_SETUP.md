# Prisma Database Setup

This project has been successfully migrated from direct SQLite usage to Prisma for better TypeScript support and developer experience.

## Database Information

- **Database Type**: SQLite
- **Database File**: `blood_markers.sqlite`
- **Table**: `lab_results` (388 records)
- **Schema Location**: `prisma/schema.prisma`
- **Generated Client**: `src/generated/prisma`

## Available NPM Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run db:generate` | Generate Prisma client from schema       |
| `npm run db:studio`   | Open Prisma Studio for database browsing |
| `npm run db:format`   | Format the Prisma schema file            |
| `npm run db:validate` | Validate the Prisma schema               |
| `npm run db:pull`     | Introspect database and update schema    |
| `npm run db:push`     | Push schema changes to database          |
| `npm run db:migrate`  | Create and run migrations                |
| `npm run db:reset`    | Reset database and run all migrations    |

## Usage Examples

### Basic Database Connection

```typescript
import { openDatabase } from "./src/lib/db";

const { prisma } = await openDatabase();
const results = await prisma.labResult.findMany();
```

### Using the Service Layer

```typescript
import { LabResultsService } from "./src/lib/labResultsService";

// Get all results
const allResults = await LabResultsService.getAllResults();

// Get results by marker
const glucoseResults = await LabResultsService.getResultsByMarker("Glucose");

// Get results with pagination
const recentResults = await LabResultsService.getAllResults({
  limit: 10,
  offset: 0,
});

// Search across multiple fields
const searchResults = await LabResultsService.searchResults("cholesterol");
```

### Type Safety

The setup includes proper TypeScript types:

- **Prisma Types**: Generated from database schema
- **Validated Types**: Zod schemas for runtime validation
- **Service Types**: High-level service layer with proper typing

```typescript
import type { LabResult } from "./src/generated/prisma";
import type { LabResultsRow } from "./src/lib/schemas/labResultsRow";

// Raw Prisma type
const rawResult: LabResult = await prisma.labResult.findFirst();

// Validated type with proper date parsing and value preprocessing
const validatedResult: LabResultsRow = validateLabResult(rawResult);
```

## Schema Overview

The `lab_results` table contains:

- `id`: Auto-incrementing primary key
- `date`: Test date (stored as TEXT in SQLite)
- `marker_name_es`: Spanish marker name (required)
- `marker_name_en`: English marker name (required)
- `value`: Test value (required, stored as TEXT to handle both numeric and text values)
- `unit`: Unit of measurement (optional)
- `reference_range`: Normal range (optional)
- `lab_name`: Laboratory name (optional)
- `doctor_protocol_notes`: Doctor's notes (optional)
- `derived`: Whether value is derived (optional)
- `comments`: Additional comments (optional)
- `other`: Other information (optional)

## Migration Notes

- ✅ Existing database schema preserved
- ✅ All 388 records intact
- ✅ TypeScript support added
- ✅ Service layer for common operations
- ✅ Type validation with Zod
- ✅ Query logging enabled
- ✅ Connection pooling configured
- ❌ Old `sqlite` and `sqlite3` packages removed

## Development Workflow

1. **Schema Changes**: Modify `prisma/schema.prisma`
2. **Generate Client**: Run `npm run db:generate`
3. **Browse Data**: Use `npm run db:studio`
4. **Validate**: Run `npm run db:validate`

The existing `npm run db:init` script continues to work for importing CSV data.

import { randomUUID } from "crypto";
import { parse } from "csv-parse";
import fs from "fs/promises";
import path from "path";

// Helper function to escape CSV fields
function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return "";
  }
  const str = String(field);
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to convert records to CSV
function recordsToCsv(
  records: Record<string, string>[],
  columns: string[]
): string {
  // Header row
  const header = columns.map(escapeCsvField).join(",");

  // Data rows
  const rows = records.map((record) =>
    columns.map((col) => escapeCsvField(record[col])).join(",")
  );

  return [header, ...rows].join("\n") + "\n";
}

async function addIdsToCsv(csvFilePath: string) {
  console.log(`\n📁 Processing: ${csvFilePath}`);

  // Read CSV file
  const fileContent = await fs.readFile(csvFilePath, { encoding: "utf-8" });
  const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    console.log(`   ⚠️  File has less than 2 lines (header + data), skipping`);
    return;
  }

  // Parse header row
  const headerRow: string[] = await new Promise(
    (resolvePromise, rejectPromise) => {
      parse(
        lines[0],
        {
          columns: false,
          skip_empty_lines: false,
          trim: true,
        },
        (err, parsedRecords) => {
          if (err) rejectPromise(err);
          else resolvePromise(parsedRecords[0] || []);
        }
      );
    }
  );

  // Parse CSV data (skip header row)
  const records: Record<string, string>[] = await new Promise(
    (resolvePromise, rejectPromise) => {
      parse(
        fileContent,
        {
          columns: headerRow, // Use header row as column names
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true, // Allow rows with different column counts
          relax_quotes: true, // Handle unquoted fields with quotes
          from_line: 2, // Skip header row
        },
        (err, parsedRecords) => {
          if (err) rejectPromise(err);
          else resolvePromise(parsedRecords);
        }
      );
    }
  );

  console.log(`   Found ${records.length} rows`);

  if (records.length === 0) {
    console.log(`   ⚠️  No rows found, skipping`);
    return;
  }

  // Check if id column already exists
  const hasIdColumn = headerRow.includes("id");
  const columnsWithoutId = hasIdColumn
    ? headerRow.filter((col) => col !== "id")
    : headerRow;

  // Add or replace UUID id column to each record
  const recordsWithIds = records.map((record) => {
    const { id, ...rest } = record; // Remove existing id if present
    return {
      id: randomUUID(),
      ...rest,
    };
  });

  // Use header columns in order, with id first
  const columnsWithId = ["id", ...columnsWithoutId];

  // Ensure all records have all columns (fill missing ones with empty string)
  const normalizedRecords = recordsWithIds.map((record) => {
    const normalized: Record<string, string> = {};
    const recordAny = record as Record<string, any>;
    for (const col of columnsWithId) {
      normalized[col] = recordAny[col] || "";
    }
    return normalized;
  });

  // Convert back to CSV
  const csvOutput = recordsToCsv(normalizedRecords, columnsWithId);

  // Write back to file
  await fs.writeFile(csvFilePath, csvOutput, { encoding: "utf-8" });
  console.log(`   ✅ Added UUID id column to ${records.length} rows`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: at least one CSV file path is required.");
    console.error("Usage: tsx src/scripts/add-ids-to-csv.ts <csv-file> [<csv-file> ...]");
    console.error("Example: tsx src/scripts/add-ids-to-csv.ts docs/labs/extracted/2026-04-15__hospital-italiano.csv");
    process.exit(1);
  }

  const csvFiles = args.map((arg) =>
    path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg)
  );

  console.log("🔄 Adding UUID id column to CSV files...");

  let failures = 0;
  for (const csvFile of csvFiles) {
    try {
      await fs.access(csvFile);
      await addIdsToCsv(csvFile);
    } catch (error) {
      failures++;
      console.error(
        `   ❌ Error processing ${csvFile}:`,
        (error as Error).message
      );
    }
  }

  console.log("\n🎉 Done!");
  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

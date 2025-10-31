import { exec } from "child_process"; // For running CLI commands
import { parse } from "csv-parse";
import fs from "fs/promises";
import path from "path";
import * as sqlite from "sqlite";
import sqlite3Driver from "sqlite3"; // Driver for the sqlite package
import { fileURLToPath } from "url";
import { promisify } from "util"; // For promisifying exec

const execAsync = promisify(exec); // Promisify exec

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get CSV file path from command line argument
const csvFileName = process.argv[2];
if (!csvFileName) {
  console.error("❌ Error: CSV file path is required.");
  console.error(
    "Usage: tsx src/scripts/import-markers-safe.ts <csv-file-path>"
  );
  console.error(
    "Example: tsx src/scripts/import-markers-safe.ts historiclabdata_2025-10-28_from_pdfs.csv"
  );
  process.exit(1);
}

const csvFilePath = path.isAbsolute(csvFileName)
  ? csvFileName
  : path.resolve(__dirname, "../../", csvFileName);
const dbFilePath = path.resolve(__dirname, "../../blood_markers.sqlite");
const tableName = "lab_results"; // Define final table name
const tempTableName = "temp_lab_results"; // Define temporary table name

// Get user_id from environment variable, default to 1
const USER_ID = process.env.USER_ID ? parseInt(process.env.USER_ID) : 1;

// Validate USER_ID
if (isNaN(USER_ID) || USER_ID < 1) {
  console.error(
    `❌ Invalid USER_ID: ${process.env.USER_ID}. Must be a positive integer.`
  );
  process.exit(1);
}

async function main() {
  console.log(`📁 Using CSV file: ${csvFilePath}`);
  console.log(`💾 Using DB file: ${dbFilePath}`);
  console.log(`👤 Assigning all markers to user_id: ${USER_ID}`);

  // Check if CSV file exists
  try {
    await fs.access(csvFilePath);
  } catch (error) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  let db: sqlite.Database | undefined;

  try {
    // Step 1: Parse CSV Headers
    console.log("\n📋 Reading CSV headers...");
    const fileContent = await fs.readFile(csvFilePath, { encoding: "utf-8" });
    const records: string[][] = await new Promise(
      (resolvePromise, rejectPromise) => {
        parse(
          fileContent,
          {
            columns: false,
            skip_empty_lines: true,
            trim: true,
            to_line: 1, // Only parse the first line
          },
          (err, parsedRecords) => {
            if (err) rejectPromise(err);
            else resolvePromise(parsedRecords);
          }
        );
      }
    );

    if (records.length < 1 || records[0].length === 0) {
      console.error("❌ CSV file is empty or has no headers.");
      return;
    }
    const columnNames = records[0];
    console.log(`✅ Found columns: ${columnNames.join(", ")}`);

    // Step 2: Prepare Database: Create Final and Temporary Tables
    console.log("\n🔧 Preparing database: creating temporary table...");
    db = await sqlite.open({
      filename: dbFilePath,
      driver: sqlite3Driver.verbose().Database,
    });
    console.log("✅ Connected to SQLite for initial table setup.");

    // Define column definitions for SQL using direct columnNames
    const sqlColumnDefinitions = columnNames
      .map((name) => `  "${name}" TEXT`)
      .join(",\n");
    const sqlColumnNamesOnly = columnNames
      .map((name) => `"${name}"`)
      .join(", ");

    // Create temporary table (tempTableName)
    await db.exec(`DROP TABLE IF EXISTS "${tempTableName}";`);
    // Temporary table columns are the same, just without the ID
    const createTempTableQuery = `CREATE TABLE "${tempTableName}" (\n${sqlColumnDefinitions}\n);`;
    await db.exec(createTempTableQuery);
    console.log(`✅ Temporary table "${tempTableName}" created.`);

    // Step 3: Parse CSV and import into Temporary Table programmatically
    console.log(
      `\n📥 Parsing CSV and importing into temporary table "${tempTableName}"...`
    );

    // Read and parse CSV file properly
    const csvFileContent = await fs.readFile(csvFilePath, {
      encoding: "utf-8",
    });
    const csvRecords: Record<string, string>[] = await new Promise(
      (resolvePromise, rejectPromise) => {
        parse(
          csvFileContent,
          {
            columns: true, // Use first row as column headers
            skip_empty_lines: true,
            trim: true,
          },
          (err, parsedRecords) => {
            if (err) rejectPromise(err);
            else resolvePromise(parsedRecords);
          }
        );
      }
    );

    console.log(`✅ Parsed ${csvRecords.length} rows from CSV.`);

    // Keep database connection open and insert rows
    console.log(`📥 Inserting rows into temporary table...`);

    // Prepare insert statement
    const placeholders = columnNames.map(() => "?").join(", ");
    const insertTempQuery = `INSERT INTO "${tempTableName}" (${sqlColumnNamesOnly}) VALUES (${placeholders})`;

    // Insert rows in batches for better performance
    const batchSize = 100;
    let tempInsertedCount = 0;

    for (let i = 0; i < csvRecords.length; i += batchSize) {
      const batch = csvRecords.slice(i, i + batchSize);
      for (const record of batch) {
        const values = columnNames.map((col) => record[col] || null);
        await db.run(insertTempQuery, values);
        tempInsertedCount++;
      }
      if (i + batchSize < csvRecords.length) {
        process.stdout.write(
          `\r   Inserted ${tempInsertedCount}/${csvRecords.length} rows...`
        );
      }
    }
    console.log(
      `\n✅ Inserted ${tempInsertedCount} rows into "${tempTableName}".`
    );

    // Step 4: Copy data from Temporary to Final Table with duplicate checking
    console.log("\n🔄 Preparing to transfer data to final table...");

    // Count rows in temp table
    const tempRowCountResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM "${tempTableName}"`
    );
    const tempRowCount = tempRowCountResult?.count || 0;
    console.log(`📊 Found ${tempRowCount} rows in temporary table.`);

    if (tempRowCount === 0) {
      console.warn(
        "⚠️  No rows found in temporary table. This might indicate an import issue."
      );
      console.log(
        "   The CSV file might be empty or the import command failed silently."
      );
      await db.exec(`DROP TABLE IF EXISTS "${tempTableName}";`);
      await db.close();
      return;
    }

    // Count existing rows in final table for this user
    const existingRowCountResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM "${tableName}" WHERE user_id = ${USER_ID}`
    );
    const existingRowCount = existingRowCountResult?.count || 0;
    console.log(
      `📊 Existing rows in final table for user_id ${USER_ID}: ${existingRowCount}`
    );

    // Create indexes temporarily to speed up duplicate checking
    console.log("🔧 Creating temporary indexes for duplicate checking...");
    try {
      await db.exec(
        `CREATE INDEX IF NOT EXISTS idx_temp_duplicate_check ON "${tempTableName}" (date, marker_name_en, value);`
      );
      await db.exec(
        `CREATE INDEX IF NOT EXISTS idx_existing_duplicate_check ON "${tableName}" (date, marker_name_en, value, user_id);`
      );
    } catch (indexError) {
      console.warn(
        "⚠️  Could not create indexes (may already exist):",
        (indexError as Error).message
      );
    }

    // Insert only rows that don't already exist
    // We check for duplicates based on: date, marker_name_en, value, user_id
    // Using LEFT JOIN which is more efficient than NOT EXISTS for large datasets
    const sqlColumnNamesWithTemp = columnNames
      .map((name) => `temp."${name}"`)
      .join(", ");

    const insertQuery = `INSERT INTO "${tableName}" (${sqlColumnNamesOnly}, user_id)
SELECT ${sqlColumnNamesWithTemp}, ${USER_ID}
FROM "${tempTableName}" AS temp
LEFT JOIN "${tableName}" AS existing
  ON existing.date = temp.date
  AND existing.marker_name_en = temp.marker_name_en
  AND existing.value = temp.value
  AND existing.user_id = ${USER_ID}
WHERE existing.id IS NULL;`;

    console.log(
      `\n🔄 Copying new data from "${tempTableName}" to "${tableName}" with user_id ${USER_ID}...`
    );
    console.log(
      "   (Skipping duplicates based on date, marker_name_en, value, user_id)"
    );
    console.log(
      "   Executing query (this may take a moment if there are many existing rows)..."
    );

    // Set a timeout for the query
    const queryStartTime = Date.now();
    const insertResult = await db.run(insertQuery);
    const queryDuration = Date.now() - queryStartTime;
    const insertedCount = insertResult.changes || 0;
    console.log(`✅ Inserted ${insertedCount} new rows in ${queryDuration}ms.`);

    // Clean up temporary indexes
    try {
      await db.exec(`DROP INDEX IF EXISTS idx_temp_duplicate_check;`);
    } catch (dropError) {
      // Ignore errors when dropping temp index
    }

    const skippedCount = tempRowCount - insertedCount;
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} duplicate rows.`);
    }

    console.log(`\n🧹 Dropping temporary table "${tempTableName}"...`);
    await db.exec(`DROP TABLE IF EXISTS "${tempTableName}";`);
    console.log(`✅ Temporary table "${tempTableName}" dropped.`);

    // Step 5: Verification
    console.log(`\n✅ Verifying import into final table "${tableName}"...`);
    const finalRowCountResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM "${tableName}" WHERE user_id = ${USER_ID}`
    );
    const finalRowCount = finalRowCountResult?.count || 0;
    console.log(
      `✅ Final table "${tableName}" now contains ${finalRowCount} rows for user_id ${USER_ID}.`
    );

    await db.close();
    db = undefined;
    console.log("\n🎉 Process finished successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Rows in CSV: ${tempRowCount}`);
    console.log(`   - New rows inserted: ${insertedCount}`);
    console.log(`   - Duplicates skipped: ${skippedCount}`);
    console.log(`   - Total rows for user_id ${USER_ID}: ${finalRowCount}`);
  } catch (error) {
    const err = error as Error;
    console.error(
      "\n❌ An error occurred during the process:",
      err.message,
      err.stack
    );
    process.exit(1);
  } finally {
    if (db) {
      console.log("\n🔒 Closing database connection in finally block...");
      try {
        await db.close();
      } catch (closeError) {
        console.error(
          "❌ Error closing database in finally block:",
          (closeError as Error).message
        );
      }
    }
  }
}

main().catch((err) => {
  console.error("❌ Unhandled error in main function execution:", err);
  process.exit(1);
});

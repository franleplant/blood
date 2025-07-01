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

const csvFilePath = path.resolve(__dirname, "../../historiclabdata.csv");
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
  console.log(`Using CSV file: ${csvFilePath}`);
  console.log(`Using DB file: ${dbFilePath}`);
  console.log(`Assigning all markers to user_id: ${USER_ID}`);

  let db: sqlite.Database | undefined;

  try {
    // Step 1: Parse CSV Headers
    console.log("Reading CSV headers...");
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
      console.error("CSV file is empty or has no headers.");
      return;
    }
    const columnNames = records[0];

    // Step 2: Prepare Database: Create Final and Temporary Tables
    console.log("Preparing database: creating final and temporary tables...");
    db = await sqlite.open({
      filename: dbFilePath,
      driver: sqlite3Driver.verbose().Database,
    });
    console.log("Connected to SQLite for initial table setup.");

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
    console.log(`Temporary table "${tempTableName}" created.`);

    await db.close();
    console.log("Database connection closed after initial table setup.");

    // Step 3: Import data into Temporary Table using sqlite3 CLI
    console.log(
      `Importing data into temporary table "${tempTableName}" via CLI...`
    );
    // Escape paths for shell command
    const escapedDbFilePath = dbFilePath.replace(/ /g, "\\\\ ");
    const escapedCsvFilePath = csvFilePath.replace(/ /g, "\\\\ ");

    const importCommand = `sqlite3 --csv "${escapedDbFilePath}" ".import --skip 1 '${escapedCsvFilePath}' ${tempTableName}"`;
    console.log(`Executing CLI command: ${importCommand}`);

    const { stdout: importStdout, stderr: importStderr } = await execAsync(
      importCommand
    );
    if (importStderr) {
      console.warn(
        "sqlite3 CLI stderr (may contain info or errors):",
        importStderr
      );
    }
    if (importStdout) {
      console.log("sqlite3 CLI stdout:", importStdout);
    }
    console.log(
      `Data import into "${tempTableName}" attempted. Check logs for details.`
    );

    // Step 4: Copy data from Temporary to Final Table and Drop Temporary Table
    console.log("Connecting to database to transfer data and clean up...");
    db = await sqlite.open({
      filename: dbFilePath,
      driver: sqlite3Driver.Database,
    });
    console.log("Connected to database for data transfer.");

    const copyDataQuery = `INSERT INTO "${tableName}" (${sqlColumnNamesOnly}, user_id)
SELECT ${sqlColumnNamesOnly}, ${USER_ID}
FROM "${tempTableName}";`;
    console.log(
      `Copying data from "${tempTableName}" to "${tableName}" with user_id ${USER_ID}...`
    );
    await db.run(copyDataQuery);
    console.log("Data copied successfully to final table.");

    console.log(`Dropping temporary table "${tempTableName}"...`);
    await db.exec(`DROP TABLE IF EXISTS "${tempTableName}";`);
    console.log(`Temporary table "${tempTableName}" dropped.`);

    // Step 5: Verification
    console.log(`Verifying import into final table "${tableName}"...`);
    const rowCountResult = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    console.log(
      `Verification: Final table "${tableName}" now contains ${
        rowCountResult?.count || 0
      } rows, all assigned to user_id ${USER_ID}.`
    );

    await db.close();
    db = undefined;
    console.log("Database connection closed. Process finished successfully.");
  } catch (error) {
    const err = error as Error;
    console.error(
      "An error occurred during the process:",
      err.message,
      err.stack
    );
    process.exit(1);
  } finally {
    if (db) {
      console.log(
        "Closing database connection in finally block (e.g., after an error)..."
      );
      try {
        await db.close();
      } catch (closeError) {
        console.error(
          "Error closing database in finally block:",
          (closeError as Error).message
        );
      }
    }
  }
}

main().catch((err) => {
  console.error("Unhandled error in main function execution:", err);
  process.exit(1);
});

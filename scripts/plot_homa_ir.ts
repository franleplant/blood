import path from "path";
import * as sqlite from "sqlite";
import sqlite3Driver from "sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.resolve(__dirname, "../blood_markers.sqlite");
const tableName = "lab_results"; // Though the query uses it directly

async function main() {
  console.log(`Querying database: ${dbFilePath}`);

  let db: sqlite.Database | undefined;

  try {
    db = await sqlite.open({
      filename: dbFilePath,
      driver: sqlite3Driver.Database,
    });
    console.log("Connected to SQLite database.");

    const query = `
SELECT
  g.date,
  --g.id AS glucose_id,
  g.value AS glucose_value,
  g.unit AS glucose_unit,
  --i.id AS insulin_id,
  i.value AS insulin_value,
  i.unit AS insulin_unit
FROM (
  SELECT * FROM ${tableName}
  WHERE LOWER(marker_name_en) LIKE '%glucose%'
    AND LOWER(marker_name_en) NOT LIKE '%minutes%'
    AND unit IS NOT NULL
    AND TRIM(unit) <> ''
) AS g
JOIN (
  SELECT * FROM ${tableName}
  WHERE LOWER(marker_name_en) LIKE '%insulin%'
    AND LOWER(marker_name_en) NOT LIKE '%minutes%'
) AS i
ON g.date = i.date;
`;

    console.log("Executing query to fetch HOMA-IR data:", query);
    // Define a more specific type for the results based on the query
    const results: Array<{
      date: string;
      glucose_value: string;
      glucose_unit: string;
      insulin_value: string;
      insulin_unit: string;
    }> = await db.all(query);

    if (results.length === 0) {
      console.log("No results found for the HOMA-IR query.");
    } else {
      console.log(`Found ${results.length} rows for HOMA-IR calculation.`);
      console.log("Query results:");
      results.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row, null, 2));
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error(
      "An error occurred during the database operation:",
      err.message,
      err.stack
    );
    process.exit(1);
  } finally {
    if (db) {
      console.log("Closing database connection...");
      try {
        await db.close();
        console.log("Database connection closed.");
      } catch (closeError) {
        console.error("Error closing database:", (closeError as Error).message);
      }
    }
  }
}

main().catch((err) => {
  console.error("Unhandled error in main function execution:", err);
  process.exit(1);
});

import path from "path";
import * as sqlite from "sqlite";
import sqlite3Driver from "sqlite3";
import { fileURLToPath } from "url";
import normalizeGlucose from "../lib/normalize_glucose_units"; // Import the normalization function

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.resolve(__dirname, "../blood_markers.sqlite");
const tableName = "lab_results";

async function main() {
  console.log(`Querying and updating database: ${dbFilePath}`);

  let db: sqlite.Database | undefined;

  try {
    db = await sqlite.open({
      filename: dbFilePath,
      driver: sqlite3Driver.Database,
    });
    console.log("Connected to SQLite database.");

    const query = `
SELECT id, value, unit, marker_name_en FROM ${tableName}
WHERE LOWER(marker_name_en) LIKE '%glucose%'
  AND LOWER(marker_name_en) NOT LIKE '%minutes%'
  AND unit IS NOT NULL
  AND TRIM(unit) <> '';
`;

    console.log("Executing query to fetch relevant rows:", query);
    // Ensure row type matches expected structure, especially id, value, unit
    const results: Array<{
      id: number;
      value: string;
      unit: string;
      marker_name_en: string;
    }> = await db.all(query);

    if (results.length === 0) {
      console.log("No results found for the query. No updates to perform.");
    } else {
      console.log(
        `Found ${results.length} rows to potentially normalize and update.`
      );
      let updatedCount = 0;
      let errorCount = 0;

      for (const row of results) {
        // Basic type checking for properties we'll use, though db.all should give consistent types
        if (
          typeof row.id !== "number" ||
          typeof row.value !== "string" ||
          typeof row.unit !== "string"
        ) {
          console.warn(
            `Skipping row due to unexpected data types: ${JSON.stringify(
              row
            )}. Expected id (number), value (string), unit (string).`
          );
          errorCount++;
          continue;
        }

        const originalValue = row.value;
        const originalUnit = row.unit;
        const id = row.id;

        try {
          const normalized = normalizeGlucose({
            value: originalValue,
            unit: originalUnit,
          });

          if (
            normalized.value !== originalValue ||
            normalized.unit !== originalUnit
          ) {
            const updateQuery = `
UPDATE ${tableName}
SET value = ?, unit = ?
WHERE id = ?;
`;
            console.log(
              `Updating row ID ${id}: from ('${originalValue}', '${originalUnit}') to ('${normalized.value}', '${normalized.unit}')`
            );
            await db.run(updateQuery, [normalized.value, normalized.unit, id]);
            console.log(`Row ID ${id} updated successfully.`);
            updatedCount++;
          } else {
            console.log(
              `Row ID ${id} ('${originalValue}', '${originalUnit}') already normalized or no change needed. No update performed.`
            );
          }
        } catch (normalizationError) {
          const err = normalizationError as Error;
          console.error(
            `Error normalizing or updating row ID ${id} ('${originalValue}', '${originalUnit}'): ${err.message}`,
            err.stack
          );
          errorCount++;
          // Continue to the next row even if one fails
        }
      }
      console.log("Finished processing all selected rows.");
      console.log(
        `Summary: ${updatedCount} rows updated, ${errorCount} rows encountered errors during processing.`
      );
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

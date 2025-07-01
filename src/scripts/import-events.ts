import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.resolve(__dirname, "../../events.csv");
const dbFilePath = path.resolve(__dirname, "../../blood_markers.sqlite");
const tableName = "events";

async function main() {
  console.log("🔄 Starting event import from CSV...");
  console.log(`📁 Using CSV file: ${csvFilePath}`);
  console.log(`📁 Using DB file: ${dbFilePath}`);

  try {
    // Import data directly into events table using sqlite3 CLI
    console.log(`Importing data into "${tableName}" table via CLI...`);

    // Escape paths for shell command
    const escapedDbFilePath = dbFilePath.replace(/ /g, "\\\\ ");
    const escapedCsvFilePath = csvFilePath.replace(/ /g, "\\\\ ");

    const importCommand = `sqlite3 --csv "${escapedDbFilePath}" ".import --skip 1 '${escapedCsvFilePath}' ${tableName}"`;
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

    // Verify import by counting rows
    console.log(`Verifying import into "${tableName}" table...`);
    const countCommand = `sqlite3 "${escapedDbFilePath}" "SELECT COUNT(*) FROM ${tableName};"`;
    const { stdout: countStdout } = await execAsync(countCommand);
    const totalEvents = parseInt(countStdout.trim());

    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📈 Total events in database: ${totalEvents}`);
  } catch (error) {
    console.error("❌ Error during event import:", error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

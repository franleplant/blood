import { parse } from "csv-parse";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { openDatabase } from "../lib/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.resolve(__dirname, "../events.csv");

interface EventCSVRow {
  id: string;
  date: string;
  title: string;
  description: string;
  user_id: string;
}

async function main() {
  console.log("🔄 Starting event import from CSV...");
  console.log(`📁 Reading CSV file: ${csvFilePath}`);

  const { prisma } = await openDatabase();

  try {
    // Read and parse CSV file
    const fileContent = await fs.readFile(csvFilePath, { encoding: "utf-8" });

    const records: EventCSVRow[] = await new Promise((resolve, reject) => {
      parse(
        fileContent,
        {
          columns: true, // Use first row as column headers
          skip_empty_lines: true,
          trim: true,
        },
        (err, parsedRecords) => {
          if (err) reject(err);
          else resolve(parsedRecords);
        }
      );
    });

    console.log(`📊 Found ${records.length} events to import`);

    if (records.length === 0) {
      console.log("⚠️  No events found in CSV file");
      return;
    }

    // Show preview of data
    console.log("\n📋 Preview of events to import:");
    records.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Date: ${event.date}`);
      console.log(`   Description: ${event.description || "(empty)"}`);
      console.log(`   User ID: ${event.user_id}`);
      console.log();
    });

    let createdCount = 0;
    let updatedCount = 0;

    for (const eventRow of records) {
      const eventId = parseInt(eventRow.id);
      const userId = parseInt(eventRow.user_id);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.log(
          `⚠️  User with ID ${userId} not found. Skipping event: ${eventRow.title}`
        );
        continue;
      }

      // Check if event already exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (existingEvent) {
        // Update existing event
        await prisma.event.update({
          where: { id: eventId },
          data: {
            date: eventRow.date,
            title: eventRow.title,
            description: eventRow.description,
            user_id: userId,
          },
        });
        console.log(`✅ Updated event: ${eventRow.title} (ID: ${eventId})`);
        updatedCount++;
      } else {
        // Create new event
        await prisma.event.create({
          data: {
            id: eventId,
            date: eventRow.date,
            title: eventRow.title,
            description: eventRow.description,
            user_id: userId,
          },
        });
        console.log(`✅ Created event: ${eventRow.title} (ID: ${eventId})`);
        createdCount++;
      }
    }

    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Created: ${createdCount} events`);
    console.log(`   - Updated: ${updatedCount} events`);
    console.log(`   - Total processed: ${createdCount + updatedCount} events`);

    // Verify import by counting total events
    const totalEvents = await prisma.event.count();
    console.log(`\n📈 Total events in database: ${totalEvents}`);
  } catch (error) {
    console.error("❌ Error during event import:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

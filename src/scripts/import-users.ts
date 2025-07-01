import { parse } from "csv-parse";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { openDatabase } from "../lib/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFilePath = path.resolve(__dirname, "../../users.csv");

interface UserCSVRow {
  id: string;
  name: string;
  height: string;
  gender: string;
}

async function main() {
  console.log("🔄 Starting user import from CSV...");
  console.log(`📁 Reading CSV file: ${csvFilePath}`);

  const { prisma } = await openDatabase();

  try {
    // Read and parse CSV file
    const fileContent = await fs.readFile(csvFilePath, { encoding: "utf-8" });

    const records: UserCSVRow[] = await new Promise((resolve, reject) => {
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

    console.log(`📊 Found ${records.length} users to import`);

    if (records.length === 0) {
      console.log("⚠️  No users found in CSV file");
      return;
    }

    // Show preview of data
    console.log("\n📋 Preview of users to import:");
    records.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Height: ${user.height}m`);
      console.log(`   Gender: ${user.gender}`);
      console.log();
    });

    let createdCount = 0;
    let updatedCount = 0;

    for (const userRow of records) {
      const userId = parseInt(userRow.id);
      const height = userRow.height ? parseFloat(userRow.height) : null;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: userRow.name,
            height: height,
            gender: userRow.gender,
          },
        });
        console.log(`✅ Updated user: ${userRow.name} (ID: ${userId})`);
        updatedCount++;
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            id: userId,
            name: userRow.name,
            height: height,
            gender: userRow.gender,
          },
        });
        console.log(`✅ Created user: ${userRow.name} (ID: ${userId})`);
        createdCount++;
      }
    }

    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Created: ${createdCount} users`);
    console.log(`   - Updated: ${updatedCount} users`);
    console.log(`   - Total processed: ${createdCount + updatedCount} users`);

    // Verify import by counting total users
    const totalUsers = await prisma.user.count();
    console.log(`\n📈 Total users in database: ${totalUsers}`);
  } catch (error) {
    console.error("❌ Error during user import:", error);
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

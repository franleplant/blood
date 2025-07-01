import { openDatabase } from "../lib/db";

interface RawLabResult {
  id: number;
  value: string;
  marker_name_en: string;
  marker_name_es: string;
}

async function normalizeDecimalSeparators() {
  console.log("🔄 Starting decimal separator normalization...");

  const { prisma } = await openDatabase();

  try {
    // Get all records that might have comma decimal separators using raw SQL
    const allResults = await prisma.$queryRaw<RawLabResult[]>`
      SELECT id, value, marker_name_en, marker_name_es 
      FROM lab_results
    `;

    console.log(`📊 Found ${allResults.length} total records to check`);

    let updatedCount = 0;
    const updates: Array<{
      id: number;
      oldValue: string;
      newValue: string;
      marker: string;
    }> = [];

    for (const result of allResults) {
      if (!result.value) continue;

      const originalValue = result.value;

      // Check if the value contains a comma and looks like it could be a decimal number
      if (originalValue.includes(",")) {
        // Check if it looks like a decimal number with comma separator
        // Examples: "1,23", "12,5", "0,91", "1.80,5" (complex case)

        let normalizedValue = originalValue;

        // Pattern 1: Simple comma decimal (e.g., "1,23" -> "1.23")
        if (/^\d+,\d+$/.test(originalValue)) {
          normalizedValue = originalValue.replace(",", ".");
        }
        // Pattern 2: Number with comma decimal at the end (e.g., "12,5 mg" -> "12.5 mg")
        else if (/\d+,\d+/.test(originalValue)) {
          normalizedValue = originalValue.replace(/(\d+),(\d+)/g, "$1.$2");
        }

        // Only update if the value actually changed
        if (normalizedValue !== originalValue) {
          updates.push({
            id: result.id,
            oldValue: originalValue,
            newValue: normalizedValue,
            marker: result.marker_name_en || result.marker_name_es || "Unknown",
          });
        }
      }
    }

    console.log(
      `📝 Found ${updates.length} records that need decimal separator normalization`
    );

    if (updates.length === 0) {
      console.log("✅ No records need decimal separator normalization");
      return;
    }

    // Show preview of changes
    console.log("\n📋 Preview of changes:");
    updates.slice(0, 10).forEach((update, index) => {
      console.log(`${index + 1}. ${update.marker} (ID: ${update.id})`);
      console.log(`   "${update.oldValue}" -> "${update.newValue}"`);
    });

    if (updates.length > 10) {
      console.log(`   ... and ${updates.length - 10} more changes`);
    }

    // Ask for confirmation (in a real scenario, you might want to add interactive prompts)
    console.log(
      `\n⚠️  This will update ${updates.length} records. Proceeding with updates...`
    );

    // Perform the updates using raw SQL
    for (const update of updates) {
      await prisma.$executeRaw`
        UPDATE lab_results 
        SET value = ${update.newValue} 
        WHERE id = ${update.id}
      `;
      updatedCount++;
    }

    console.log(
      `\n✅ Successfully normalized decimal separators in ${updatedCount} records`
    );

    // Show summary of what was changed
    const markerStats = updates.reduce((acc, update) => {
      acc[update.marker] = (acc[update.marker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n📊 Summary by marker:");
    Object.entries(markerStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([marker, count]) => {
        console.log(`   ${marker}: ${count} records`);
      });
  } catch (error) {
    console.error("❌ Error during decimal separator normalization:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to validate that a string is a valid number after normalization
function isValidNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

// Run the script
normalizeDecimalSeparators().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

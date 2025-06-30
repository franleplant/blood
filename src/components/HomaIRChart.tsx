import { openDatabase } from "@/lib/db";
import normalizeGlucose from "@/lib/normalize_glucose_units";
import { labResultsRowSchema } from "@/lib/schemas/labResultsRow";
import sqlite3 from "sqlite3";
import { z } from "zod";
import HomaIRChartClient from "./HomaIRChartClient";

const HOMA_IR_DIVISOR = 405;

const homaIRQueryRowSchema = z.object({
  date: z.coerce.date(),
  glucose_value: labResultsRowSchema.shape.value,
  glucose_unit: z.string(),
  insulin_value: labResultsRowSchema.shape.value,
  insulin_unit: z.string().nullable(),
});

async function getHomaIRData() {
  const { db } = await openDatabase({
    filename: "./blood_markers.sqlite",
    driver: sqlite3.Database,
  });

  const query = `
    SELECT
    g.date,
    g.value AS glucose_value,
    g.unit AS glucose_unit,
    i.value AS insulin_value,
    i.unit AS insulin_unit
    FROM (
    SELECT date, value, unit, marker_name_en FROM lab_results
    WHERE LOWER(marker_name_en) LIKE '%glucose%'
        AND LOWER(marker_name_en) NOT LIKE '%minutes%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
    ) AS g
    JOIN (
    SELECT date, value, unit, marker_name_en FROM lab_results
    WHERE LOWER(marker_name_en) LIKE '%insulin%'
        AND LOWER(marker_name_en) NOT LIKE '%minutes%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
    ) AS i
    ON g.date = i.date
    ORDER BY g.date ASC;
`;

  const results = await db.all(query);
  const parsedResults = z.array(homaIRQueryRowSchema).safeParse(results);

  if (!parsedResults.success) {
    console.error("Error parsing HOMA-IR data:", parsedResults.error);
    return [];
  }

  const homaIRDataPoints = parsedResults.data
    .map((row) => {
      try {
        const correctInsulinUnit = "µUI/ml";
        if (
          row.insulin_unit?.toLowerCase() !== correctInsulinUnit.toLowerCase()
        ) {
          console.warn(
            `Skipping row (Date: ${row.date}): Invalid insulin unit '${row.insulin_unit}'. Expected '${correctInsulinUnit}'.`
          );
          return null;
        }

        const normalizedGlucose = normalizeGlucose({
          value: String(row.glucose_value),
          unit: row.glucose_unit,
        });
        const glucoseValMgDl = parseFloat(normalizedGlucose.value);
        const insulinValMicroUML = parseFloat(String(row.insulin_value));

        if (isNaN(glucoseValMgDl) || isNaN(insulinValMicroUML)) {
          console.warn(
            `Skipping row (Date: ${row.date}): Invalid number for glucose or insulin.`
          );
          return null;
        }
        const homaIR = (glucoseValMgDl * insulinValMicroUML) / HOMA_IR_DIVISOR;

        return { date: row.date, homaIR };
      } catch (error) {
        console.error(
          `Error processing row (Date: ${row.date}): ${
            (error as Error).message
          }`
        );
        return null;
      }
    })
    .filter((point): point is { date: Date; homaIR: number } => point !== null);

  return homaIRDataPoints;
}

export default async function HomaIRChart() {
  const data = await getHomaIRData();
  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No HOMA-IR data to display. This chart requires both glucose and insulin
        measurements on the same day.
      </div>
    );
  }
  return <HomaIRChartClient data={data} />;
}

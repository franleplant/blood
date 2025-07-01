import GlucoseChartClient from "@/components/GlucoseChartClient";
import { openDatabase } from "@/lib/db";
import normalizeGlucose from "@/lib/normalize_glucose_units";
import { labResultsRowSchema } from "@/lib/schemas/labResultsRow";
import { z } from "zod";

async function getGlucoseData() {
  const { db } = await openDatabase();

  const query = `
    SELECT * FROM lab_results
    WHERE LOWER(marker_name_en) LIKE '%glucose%'
      AND LOWER(marker_name_en) NOT LIKE '%minutes%'
      AND unit IS NOT NULL
      AND TRIM(unit) <> '';
  `;

  const results = await db.all(query);
  const parsedResults = z.array(labResultsRowSchema).safeParse(results);

  if (!parsedResults.success) {
    console.error("Error parsing glucose data:", parsedResults.error);
    return [];
  }

  const glucoseDataPoints = parsedResults.data.map((row) => {
    const normalized = normalizeGlucose({
      value: String(row.value),
      unit: row.unit ?? "",
    });
    return {
      date: row.date.getTime(),
      value: parseFloat(normalized.value),
    };
  });

  return glucoseDataPoints;
}

export default async function GlucoseChart() {
  const data = await getGlucoseData();

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">No glucose data to display.</div>
    );
  }
  return <GlucoseChartClient data={data} />;
}

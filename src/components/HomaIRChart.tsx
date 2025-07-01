import { openDatabase } from "@/lib/db";
import normalizeGlucose from "@/lib/normalize_glucose_units";
import HomaIRChartClient from "./HomaIRChartClient";

const HOMA_IR_DIVISOR = 405;

interface Props {
  userId: number;
}

async function getHomaIRData(userId: number) {
  const { prisma } = await openDatabase();

  const results = await prisma.$queryRaw<
    Array<{
      date: string;
      glucose_value: number;
      glucose_unit: string;
      insulin_value: number;
      insulin_unit: string | null;
    }>
  >`
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
        AND user_id = ${userId}
    ) AS g
    JOIN (
      SELECT date, value, unit, marker_name_en FROM lab_results
      WHERE LOWER(marker_name_en) LIKE '%insulin%'
        AND LOWER(marker_name_en) NOT LIKE '%minutes%'
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS i
    ON g.date = i.date
    ORDER BY g.date ASC
  `;
  const homaIRDataPoints = results
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

        return { date: new Date(row.date), homaIR };
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

async function getEventsData(userId: number) {
  const { prisma } = await openDatabase();

  const events = await prisma.event.findMany({
    where: {
      user_id: userId,
    },
    orderBy: {
      date: "asc",
    },
  });

  return events.map((event) => ({
    date: new Date(event.date),
    title: event.title,
    description: event.description,
  }));
}

export default async function HomaIRChart({ userId }: Props) {
  const [data, events] = await Promise.all([
    getHomaIRData(userId),
    getEventsData(userId),
  ]);

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No HOMA-IR data to display. This chart requires both glucose and insulin
        measurements on the same day.
      </div>
    );
  }
  return <HomaIRChartClient data={data} events={events} />;
}

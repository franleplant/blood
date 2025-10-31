import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";
import TriglyceridesHDLRatioChartClient from "./TriglyceridesHDLRatioChartClient";

interface Props {
  userId: number;
  dateRange?: { min: number; max: number };
}

async function getTriglyceridesHDLRatioData(userId: number) {
  const { prisma } = await openDatabase();

  const results = await prisma.$queryRaw<
    Array<{
      date: string;
      triglycerides_value: number;
      triglycerides_unit: string;
      hdl_value: number;
      hdl_unit: string;
    }>
  >`
    SELECT
      t.date,
      t.value AS triglycerides_value,
      t.unit AS triglycerides_unit,
      h.value AS hdl_value,
      h.unit AS hdl_unit
    FROM (
      SELECT date, value, unit, marker_name_en FROM lab_results 
      WHERE (LOWER(marker_name_en) LIKE '%triglycerides%' OR LOWER(marker_name_en) LIKE '%triglicéridos%')
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS t
    JOIN (
      SELECT date, value, unit, marker_name_en FROM lab_results
      WHERE (LOWER(marker_name_en) LIKE '%hdl%' AND LOWER(marker_name_en) NOT LIKE '%ldl%' AND LOWER(marker_name_en) NOT LIKE '%ratio%')
        AND unit IS NOT NULL AND TRIM(unit) <> ''
        AND user_id = ${userId}
    ) AS h
    ON t.date = h.date
    ORDER BY t.date ASC
  `;

  const ratioDataPoints = results
    .map((row) => {
      try {
        if (!row.triglycerides_unit) {
          console.warn(
            `Skipping row (Date: ${row.date}): Missing triglycerides unit.`
          );
          return null;
        }

        const normalizedTriglycerides = normalizeUnits(
          {
            value: String(row.triglycerides_value),
            unit: row.triglycerides_unit,
          },
          "mg/dL"
        );
        const triglyceridesMgDl = parseFloat(normalizedTriglycerides.value);

        if (!row.hdl_unit) {
          console.warn(`Skipping row (Date: ${row.date}): Missing HDL unit.`);
          return null;
        }

        const normalizedHdl = normalizeUnits(
          {
            value: String(row.hdl_value),
            unit: row.hdl_unit,
          },
          "mg/dL"
        );
        const hdlMgDl = parseFloat(normalizedHdl.value);

        if (isNaN(triglyceridesMgDl) || isNaN(hdlMgDl) || hdlMgDl === 0) {
          console.warn(
            `Skipping row (Date: ${row.date}): Invalid number for triglycerides or HDL, or HDL is zero.`
          );
          return null;
        }

        const ratio = triglyceridesMgDl / hdlMgDl;

        return {
          date: new Date(row.date),
          triglyceridesHDLRatio: ratio,
          triglycerides: triglyceridesMgDl,
          hdl: hdlMgDl,
        };
      } catch (error) {
        console.error(
          `Error processing row (Date: ${row.date}): ${
            (error as Error).message
          }`
        );
        return null;
      }
    })
    .filter(
      (
        point
      ): point is {
        date: Date;
        triglyceridesHDLRatio: number;
        triglycerides: number;
        hdl: number;
      } => point !== null
    );

  return ratioDataPoints;
}

async function getEvents(userId: number) {
  const { prisma } = await openDatabase();
  return await prisma.event.findMany({
    where: { user_id: userId },
    orderBy: { date: "asc" },
  });
}

export default async function TriglyceridesHDLRatioChart({
  userId,
  dateRange,
}: Props) {
  const [data, events] = await Promise.all([
    getTriglyceridesHDLRatioData(userId),
    getEvents(userId),
  ]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No triglycerides/HDL ratio data available
      </div>
    );
  }

  return (
    <TriglyceridesHDLRatioChartClient
      data={data}
      events={events}
      dateRange={dateRange}
    />
  );
}

import GlucoseChartClient from "@/components/GlucoseChartClient";
import { openDatabase } from "@/lib/db";
import normalizeGlucose from "@/lib/normalize_glucose_units";

async function getGlucoseData() {
  const { prisma } = await openDatabase();

  const results = await prisma.labResult.findMany({
    where: {
      marker_name_en: {
        contains: "glucose",
      },
      NOT: {
        marker_name_en: {
          contains: "minutes",
        },
      },
      unit: {
        not: "",
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const glucoseDataPoints = results.map((row) => {
    const normalized = normalizeGlucose({
      value: String(row.value),
      unit: row.unit ?? "",
    });
    return {
      date: new Date(row.date).getTime(),
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

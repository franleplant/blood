import LiverEnzymesChartClient from "@/components/LiverEnzymesChartClient";
import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";

interface Props {
  userId: number;
}

async function getLiverEnzymeData(userId: number) {
  const { prisma } = await openDatabase();

  const markersToFetch = ["AST", "ALT", "GGT"];

  const results = await prisma.labResult.findMany({
    where: {
      user_id: userId,
      OR: markersToFetch.map((marker) => ({
        marker_name_en: {
          contains: marker,
        },
      })),
      unit: {
        not: "",
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const dataPoints = results.map((row) => {
    const normalized = normalizeUnits(
      {
        value: String(row.value),
        unit: row.unit ?? "",
      },
      "U/L"
    );
    return {
      date: new Date(row.date).getTime(),
      marker: row.marker_name_en,
      value: parseFloat(normalized.value),
    };
  });

  const dateMap: {
    [date: string]: { date: number; AST?: number; ALT?: number; GGT?: number };
  } = {};

  dataPoints.forEach((point) => {
    const dateStr = new Date(point.date).toISOString().split("T")[0];
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = { date: point.date };
    }
    if (point.marker.includes("AST")) dateMap[dateStr].AST = point.value;
    if (point.marker.includes("ALT")) dateMap[dateStr].ALT = point.value;
    if (point.marker.includes("GGT")) dateMap[dateStr].GGT = point.value;
  });

  return Object.values(dateMap).sort((a, b) => a.date - b.date);
}

export default async function LiverEnzymesChart({ userId }: Props) {
  const data = await getLiverEnzymeData(userId);

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No liver enzyme data to display.
      </div>
    );
  }
  return <LiverEnzymesChartClient data={data} />;
}

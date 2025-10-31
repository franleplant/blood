import TotalTestosteroneChartClient from "@/components/TotalTestosteroneChartClient";
import { openDatabase } from "@/lib/db";
import normalizeTestosterone from "@/lib/normalize_testosterone";

interface Props {
  userId: number;
  dateRange?: { min: number; max: number };
}

async function getTotalTestosteroneData(userId: number) {
  const { prisma } = await openDatabase();

  const results = await prisma.labResult.findMany({
    where: {
      user_id: userId,
      marker_name_en: {
        contains: "Total Testosterone",
      },
      unit: {
        not: "",
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const testosteroneDataPoints = results
    .map((row) => {
      try {
        const normalized = normalizeTestosterone({
          value: String(row.value),
          unit: row.unit ?? "",
        });
        const value = parseFloat(normalized.value);
        if (isNaN(value)) {
          return null;
        }
        return {
          date: new Date(row.date).getTime(),
          value,
        };
      } catch (error) {
        // Skip invalid values
        return null;
      }
    })
    .filter(
      (point): point is { date: number; value: number } => point !== null
    );

  return testosteroneDataPoints;
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

export default async function TotalTestosteroneChart({
  userId,
  dateRange,
}: Props) {
  const [data, events] = await Promise.all([
    getTotalTestosteroneData(userId),
    getEventsData(userId),
  ]);

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No Total Testosterone data to display.
      </div>
    );
  }
  return (
    <TotalTestosteroneChartClient
      data={data}
      events={events}
      dateRange={dateRange}
    />
  );
}

import GlucoseChartClient from "@/components/GlucoseChartClient";
import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";

interface Props {
  userId: number;
  dateRange?: { min: number; max: number };
}

async function getGlucoseData(userId: number) {
  const { prisma } = await openDatabase();

  const results = await prisma.labResult.findMany({
    where: {
      user_id: userId,
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
    const normalized = normalizeUnits(
      {
        value: String(row.value),
        unit: row.unit ?? "",
      },
      "mg/dL"
    );
    return {
      date: new Date(row.date).getTime(),
      value: parseFloat(normalized.value),
    };
  });

  return glucoseDataPoints;
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

export default async function GlucoseChart({ userId, dateRange }: Props) {
  const [data, events] = await Promise.all([
    getGlucoseData(userId),
    getEventsData(userId),
  ]);

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">No glucose data to display.</div>
    );
  }
  return (
    <GlucoseChartClient data={data} events={events} dateRange={dateRange} />
  );
}

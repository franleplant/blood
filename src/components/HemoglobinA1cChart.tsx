import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";
import HemoglobinA1cChartClient from "./HemoglobinA1cChartClient";

interface Props {
  userId: number;
}

async function getHemoglobinA1cData(userId: number) {
  const { prisma } = await openDatabase();

  const results = await prisma.labResult.findMany({
    where: {
      user_id: userId,
      marker_name_en: {
        contains: "A1c",
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
      "%"
    );
    return {
      date: new Date(row.date).getTime(),
      value: parseFloat(normalized.value),
    };
  });

  return dataPoints;
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

export default async function HemoglobinA1cChart({ userId }: Props) {
  const [data, events] = await Promise.all([
    getHemoglobinA1cData(userId),
    getEventsData(userId),
  ]);

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No Glycated Hemoglobin data to display.
      </div>
    );
  }
  return <HemoglobinA1cChartClient data={data} events={events} />;
}

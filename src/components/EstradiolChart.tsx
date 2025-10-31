import EstradiolChartClient from "@/components/EstradiolChartClient";
import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";

interface Props {
  userId: number;
  dateRange?: { min: number; max: number };
}

async function getEstradiolData(userId: number) {
  const { prisma } = await openDatabase();

  const results = await prisma.labResult.findMany({
    where: {
      user_id: userId,
      marker_name_en: {
        contains: "Estradiol",
      },
      unit: {
        not: "",
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const estradiolDataPoints = results
    .map((row) => {
      try {
        const normalized = normalizeUnits(
          {
            value: String(row.value),
            unit: row.unit ?? "",
          },
          "pg/mL"
        );
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

  return estradiolDataPoints;
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

export default async function EstradiolChart({ userId, dateRange }: Props) {
  const [data, events] = await Promise.all([
    getEstradiolData(userId),
    getEventsData(userId),
  ]);

  if (data.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No Estradiol (E2) data to display.
      </div>
    );
  }
  return (
    <EstradiolChartClient data={data} events={events} dateRange={dateRange} />
  );
}

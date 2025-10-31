import { openDatabase } from "@/lib/db";
import normalizeUnits from "@/lib/normalize_units";
import type { Event } from "../generated/prisma";
import UricAcidChartClient from "./UricAcidChartClient";

type ChartData = {
  date: Date;
  value: number;
};

async function getUricAcidData(): Promise<ChartData[]> {
  const { prisma } = await openDatabase();
  const uricAcidData = await prisma.labResult.findMany({
    where: { marker_name_en: { contains: "Uric Acid" } },
  });
  const uricemiaData = await prisma.labResult.findMany({
    where: { marker_name_en: { contains: "Uricemia" } },
  });

  const combinedData = [...uricAcidData, ...uricemiaData];

  const normalizedData = combinedData.map((d) => {
    if (!d.unit) {
      return null;
    }
    const normalizedValue = normalizeUnits(
      {
        value: d.value,
        unit: d.unit,
      },
      "mg/dL"
    );
    return {
      date: new Date(d.date),
      value: parseFloat(normalizedValue.value),
    };
  });

  return normalizedData
    .filter((d): d is ChartData => d !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function getAllEvents(): Promise<Event[]> {
  const { prisma } = await openDatabase();
  return await prisma.event.findMany({
    orderBy: {
      date: "desc",
    },
  });
}

export default async function UricAcidChart({
  dateRange,
}: {
  dateRange?: { min: number; max: number };
}) {
  const allEvents = await getAllEvents();
  const chartData = await getUricAcidData();

  const processedChartData = chartData.map((d) => ({
    date: d.date.getTime(),
    value: d.value,
  }));

  return (
    <UricAcidChartClient
      data={processedChartData}
      events={allEvents}
      dateRange={dateRange}
    />
  );
}

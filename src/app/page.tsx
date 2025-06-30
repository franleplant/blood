import GlucoseChart from "@/components/GlucoseChart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { openDatabase } from "@/lib/db";
import normalizeGlucose from "@/lib/normalize_glucose_units";
import {
  LabResultsRow,
  labResultsRowSchema,
} from "@/lib/schemas/labResultsRow";
import sqlite3 from "sqlite3";
import { z } from "zod";

async function getBloodMarkers(): Promise<LabResultsRow[]> {
  const { db } = await openDatabase({
    filename: "./blood_markers.sqlite",
    driver: sqlite3.Database,
  });

  const markers = await db.all("SELECT * FROM lab_results ORDER BY date DESC");
  console.log(markers);
  const parsedMarkers = z.array(labResultsRowSchema).parse(markers);

  return parsedMarkers;
}

export default async function Home() {
  const markers = await getBloodMarkers();
  const normalizedMarkers = markers.map((marker) => {
    if (
      marker.marker_name_en === "Glucose" &&
      typeof marker.value === "number" &&
      marker.unit
    ) {
      const result = normalizeGlucose({
        value: marker.value.toString(),
        unit: marker.unit,
      });
      return {
        ...marker,
        value: result.value,
        unit: result.unit,
      };
    }
    return marker;
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center">Blood Markers</h1>
      </div>

      <div className="w-full max-w-5xl">
        <GlucoseChart data={normalizedMarkers} />
      </div>

      <div className="w-full max-w-5xl">
        <Table>
          <TableCaption>A list of your recent blood markers.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Marker</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {normalizedMarkers.map((marker) => (
              <TableRow key={marker.id}>
                <TableCell className="font-medium">
                  {marker.date.toLocaleDateString()}
                </TableCell>
                <TableCell>{marker.marker_name_en}</TableCell>
                <TableCell className="text-right">
                  {marker.value.toString()}
                </TableCell>
                <TableCell>{marker.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

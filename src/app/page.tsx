import GlucoseChart from "@/components/GlucoseChart";
import HomaIRChart from "@/components/HomaIRChart";
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
  const parsedMarkers = z.array(labResultsRowSchema).parse(markers);

  return parsedMarkers;
}

export default async function Home() {
  const markers = await getBloodMarkers();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center">Blood Markers</h1>
      </div>

      <div className="w-full max-w-5xl">
        <h2 className="text-2xl font-bold text-center my-4">Fasting Glucose</h2>
        <GlucoseChart />
      </div>

      <div className="w-full max-w-5xl mt-8">
        <h2 className="text-2xl font-bold text-center my-4">HOMA-IR</h2>
        <HomaIRChart />
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
            {markers.map((marker) => (
              <TableRow key={marker.id}>
                <TableCell className="font-medium">
                  {marker.date.toLocaleDateString()}
                </TableCell>
                <TableCell>{marker.marker_name_en}</TableCell>
                <TableCell className="text-right">
                  {typeof marker.value === "number"
                    ? marker.value.toFixed(2)
                    : marker.value}
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

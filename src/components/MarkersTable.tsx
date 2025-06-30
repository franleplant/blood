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

export default async function MarkersTable() {
  const markers = await getBloodMarkers();

  if (markers.length === 0) {
    return (
      <div className="w-full text-center p-4">
        No blood marker data to display.
      </div>
    );
  }

  return (
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
  );
}

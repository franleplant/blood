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

interface BloodMarker {
  id: number;
  marker_name_en: string;
  value: string;
  unit: string;
  date: string;
}

async function getBloodMarkers(): Promise<BloodMarker[]> {
  const sqlite3 = await import("sqlite3");
  const { db } = await openDatabase({
    filename: "./blood_markers.sqlite",
    driver: sqlite3.Database,
  });

  const markers = await db.all("SELECT * FROM lab_results ORDER BY date DESC");

  return markers as BloodMarker[];
}

export default async function Home() {
  const markers = await getBloodMarkers();
  const normalizedMarkers = markers.map((marker) => {
    if (marker.marker === "Glucose") {
      return {
        ...marker,
        ...normalizeGlucose(marker),
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
        <GlucoseChart data={markers} />
      </div>

      <div className="w-full max-w-5xl">
        <Table>
          <TableCaption>A list of your recent blood markers.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Marker</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markers.map((marker) => (
              <TableRow key={marker.id}>
                <TableCell>{marker.date}</TableCell>
                <TableCell>{marker.marker_name_en}</TableCell>
                <TableCell>{marker.value}</TableCell>
                <TableCell>{marker.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

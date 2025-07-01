import { openDatabase } from "@/lib/db";
import {
  LabResultsRow,
  labResultsRowSchema,
} from "@/lib/schemas/labResultsRow";
import { z } from "zod";
import { columns } from "./columns";
import { DataTable } from "./data-table";

async function getBloodMarkers(): Promise<LabResultsRow[]> {
  const { db } = await openDatabase();

  const markers = await db.all("SELECT * FROM lab_results");
  const parsedMarkers = z.array(labResultsRowSchema).parse(markers);

  return parsedMarkers;
}

export default async function MarkersTable() {
  const markers = await getBloodMarkers();

  return <DataTable columns={columns} data={markers} />;
}

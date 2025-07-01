import { openDatabase } from "@/lib/db";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function MarkersTable() {
  const { prisma } = await openDatabase();
  const markers = await prisma.labResult.findMany();

  return <DataTable columns={columns} data={markers} />;
}

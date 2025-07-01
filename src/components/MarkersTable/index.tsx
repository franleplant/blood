import { openDatabase } from "@/lib/db";
import { columns } from "./columns";
import { DataTable } from "./data-table";

interface Props {
  userId: number;
}

export default async function MarkersTable({ userId }: Props) {
  const { prisma } = await openDatabase();
  const markers = await prisma.labResult.findMany({
    where: {
      user_id: userId,
    },
  });

  return <DataTable columns={columns} data={markers} />;
}

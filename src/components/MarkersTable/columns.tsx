"use client";

import { Button } from "@/components/ui/button";
import { LabResultsRow } from "@/lib/schemas/labResultsRow";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const columns: ColumnDef<LabResultsRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: "marker_name_en",
    header: "Marker",
  },
  {
    accessorKey: "value",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Value
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue("value");
      if (typeof value === "number") {
        return <div className="text-right">{value.toFixed(2)}</div>;
      }
      return <div className="text-right">{value as string}</div>;
    },
  },
  {
    accessorKey: "unit",
    header: "Unit",
  },
];

"use client";

import type { LabResult } from "@/generated/prisma";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

function SortHeader({
  label,
  column,
  align = "left",
}: {
  label: string;
  column: Column<LabResult, unknown>;
  align?: "left" | "right";
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className={`group inline-flex items-center gap-1.5 ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      {label}
      <Icon
        className={`size-3 transition ${
          sorted ? "text-slate-700" : "text-slate-300 group-hover:text-slate-500"
        }`}
      />
    </button>
  );
}

export const columns: Array<ColumnDef<LabResult>> = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortHeader label="Date" column={column} />,
    cell: ({ row }) => {
      const date = new Date(row.getValue<string>("date"));
      return (
        <span className="tabular-nums text-slate-600">
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "marker_name_en",
    header: ({ column }) => <SortHeader label="Marker" column={column} />,
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {row.getValue<string>("marker_name_en")}
      </span>
    ),
  },
  {
    accessorKey: "marker_name_es",
    header: ({ column }) => <SortHeader label="Marker (ES)" column={column} />,
    cell: ({ row }) => {
      const v = row.getValue<string | null>("marker_name_es");
      return v ? (
        <span className="text-slate-500">{v}</span>
      ) : (
        <span className="text-slate-300">—</span>
      );
    },
  },
  {
    accessorKey: "value",
    header: ({ column }) => (
      <div className="text-right">
        <SortHeader label="Value" column={column} align="right" />
      </div>
    ),
    cell: ({ row }) => {
      const value = row.getValue("value");
      const display =
        typeof value === "number" ? value.toFixed(2) : (value as string);
      return (
        <div className="text-right font-medium tabular-nums text-slate-900">
          {display}
        </div>
      );
    },
  },
  {
    accessorKey: "unit",
    header: "Unit",
    cell: ({ row }) => (
      <span className="text-slate-500">{row.getValue<string>("unit")}</span>
    ),
  },
  {
    accessorKey: "reference_range",
    header: "Reference",
    cell: ({ row }) => {
      const v = row.getValue<string | null>("reference_range");
      return v ? (
        <span className="tabular-nums text-slate-500">{v}</span>
      ) : (
        <span className="text-slate-300">—</span>
      );
    },
  },
  {
    accessorKey: "lab_name",
    header: ({ column }) => <SortHeader label="Lab" column={column} />,
    cell: ({ row }) => {
      const v = row.getValue<string | null>("lab_name");
      return v ? (
        <span className="text-slate-500">{v}</span>
      ) : (
        <span className="text-slate-300">—</span>
      );
    },
  },
];

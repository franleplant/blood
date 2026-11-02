"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

// Match the search query against both English and Spanish marker names.
function nameSearchFilter<TData>(
  row: Row<TData>,
  _columnId: string,
  filterValue: string,
): boolean {
  const search = filterValue.trim().toLowerCase();
  if (!search) return true;
  const en = String(row.getValue("marker_name_en") ?? "").toLowerCase();
  const es = String(row.getValue("marker_name_es") ?? "").toLowerCase();
  return en.includes(search) || es.includes(search);
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  // The input value is committed synchronously so typing stays responsive;
  // the table reads the deferred copy so the heavy re-render of 500+ rows
  // doesn't block keystrokes.
  const [searchInput, setSearchInput] = React.useState("");
  const deferredSearch = React.useDeferredValue(searchInput);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: nameSearchFilter,
    state: { sorting, globalFilter: deferredSearch },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-slate-900">Lab Data</h1>
          <span className="text-xs text-slate-500">
            {totalRows.toLocaleString()} rows
          </span>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Filter markers"
            aria-label="Filter markers"
            value={searchInput}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchInput(event.target.value)
            }
            className="h-11 w-full rounded-md border-slate-200 bg-white pl-8 text-base sm:h-8 sm:text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
          SORT
        </span>
        {(
          [
            ["date", "Date"],
            ["marker_name_en", "Marker"],
            ["value", "Value"],
          ] as const
        ).map(([id, label]) => {
          const column = table.getColumn(id);
          if (!column) return null;
          const sorted = column.getIsSorted();
          const Icon =
            sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
          return (
            <button
              key={id}
              type="button"
              onClick={() => column.toggleSorting(sorted === "asc")}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                sorted
                  ? "border-slate-300 bg-slate-50 text-slate-900"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {label}
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col divide-y divide-slate-100 md:hidden">
        {rows.length ? (
          rows.map((row) => <MarkerCard key={row.id} row={row} />)
        ) : (
          <li className="px-3 py-10 text-center text-sm text-slate-500">
            No results.
          </li>
        )}
      </ul>

      <div className="hidden md:block">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-slate-200 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-9 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="px-5 py-2.5 text-sm text-slate-700"
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-slate-500"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </section>
  );
}

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function formatRowDate(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Phone layout: one lab result per card so the value sits next to the name.
// A wide table would hide the value behind a horizontal scroll, and a sticky
// first column still splits the record. From md up, the table is unchanged.
function MarkerCard<TData>({ row }: { row: Row<TData> }) {
  const name = asText(row.getValue("marker_name_en"));
  const es = asText(row.getValue("marker_name_es"));
  const value = asText(row.getValue("value"));
  const unit = asText(row.getValue("unit"));
  const reference = asText(row.getValue("reference_range"));
  const lab = asText(row.getValue("lab_name"));
  const date = formatRowDate(asText(row.getValue("date")));

  return (
    <li className="px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-snug text-slate-900">
            {name}
          </div>
          {es && es !== name ? (
            <div className="mt-0.5 text-xs leading-snug text-slate-500">{es}</div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums text-slate-900">
            {value}
          </div>
          {unit ? <div className="text-xs text-slate-500">{unit}</div> : null}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
        <span className="tabular-nums text-slate-600">{date}</span>
        {reference ? <span className="tabular-nums">Ref {reference}</span> : null}
        {lab ? <span className="break-words">{lab}</span> : null}
      </div>
    </li>
  );
}

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
import { Search } from "lucide-react";
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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-slate-900">Lab Data</h1>
          <span className="text-xs text-slate-500">
            {totalRows.toLocaleString()} rows
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Filter markers"
            value={searchInput}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchInput(event.target.value)
            }
            className="h-8 w-56 rounded-md border-slate-200 bg-white pl-8 text-xs"
          />
        </div>
      </div>

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
    </section>
  );
}

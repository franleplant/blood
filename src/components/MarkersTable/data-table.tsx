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
  // null until mounted so the server and the first client render match.
  // After that, only the cards or only the table is in the document.
  const mdUp = useMdUp();

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

      {mdUp === null ? (
        <div className="h-24" />
      ) : mdUp ? (
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
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {rows.length ? (
            rows.map((row) => <MarkerCard key={row.id} row={row} />)
          ) : (
            <li className="px-3 py-10 text-center text-sm text-slate-500">
              No results.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function useMdUp(): boolean | null {
  const [mdUp, setMdUp] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setMdUp(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mdUp;
}

function renderCell<TData>(row: Row<TData>, id: string): React.ReactNode {
  const cell = row.getVisibleCells().find((item) => item.column.id === id);
  if (!cell) return null;
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

// Phone layout: one lab result per card so the value sits next to the name.
// Formatting comes from the column definitions so the card and the table
// can't drift. From md up, only the table is mounted.
function MarkerCard<TData>({ row }: { row: Row<TData> }) {
  const name = row.getValue("marker_name_en");
  const es = row.getValue("marker_name_es");
  const showEs =
    es != null && String(es) !== "" && String(es) !== String(name ?? "");
  const reference = row.getValue("reference_range");
  const lab = row.getValue("lab_name");

  return (
    <li className="px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-snug text-slate-900">
            {renderCell(row, "marker_name_en")}
          </div>
          {showEs ? (
            <div className="mt-0.5 text-xs leading-snug text-slate-500">
              {renderCell(row, "marker_name_es")}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {renderCell(row, "value")}
          <div className="text-xs text-slate-500">{renderCell(row, "unit")}</div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-slate-500">
        {renderCell(row, "date")}
        {reference ? (
          <span className="inline-flex items-baseline gap-1">
            <span>Ref</span>
            {renderCell(row, "reference_range")}
          </span>
        ) : null}
        {lab ? (
          <span className="break-words">{renderCell(row, "lab_name")}</span>
        ) : null}
      </div>
    </li>
  );
}

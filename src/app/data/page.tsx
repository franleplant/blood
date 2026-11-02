import MarkersTable from "@/components/MarkersTable";

export default function DataPage() {
  const userId = 1;
  return (
    <main className="min-h-screen bg-slate-50 px-2 py-2 text-slate-900 sm:px-5 sm:py-5">
      <MarkersTable userId={userId} />
    </main>
  );
}

import MarkersTable from "@/components/MarkersTable";

export default function DataPage() {
  const userId = 1;
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-5 text-slate-900">
      <MarkersTable userId={userId} />
    </main>
  );
}

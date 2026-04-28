import MarkersTable from "@/components/MarkersTable";

export default function DataPage() {
  const userId = 1;
  return (
    <main className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Lab Data
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          All individual marker readings.
        </p>
      </div>
      <MarkersTable userId={userId} />
    </main>
  );
}

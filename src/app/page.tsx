import GlucoseChart from "@/components/GlucoseChart";
import HomaIRChart from "@/components/HomaIRChart";
import MarkersTable from "@/components/MarkersTable";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center">Blood Markers</h1>
      </div>

      <div className="w-full max-w-5xl mt-8">
        <h2 className="text-2xl font-bold text-center my-4">Fasting Glucose</h2>
        <GlucoseChart userId={1} />
      </div>

      <div className="w-full max-w-5xl mt-8">
        <h2 className="text-2xl font-bold text-center my-4">HOMA-IR</h2>
        <HomaIRChart userId={1} />
      </div>

      <div className="w-full max-w-5xl mt-8">
        <h2 className="text-2xl font-bold text-center my-4">All Markers</h2>
        <MarkersTable userId={1} />
      </div>
    </main>
  );
}

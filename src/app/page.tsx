import GlucoseChart from "@/components/GlucoseChart";
import HemoglobinA1cChart from "@/components/HemoglobinA1cChart";
import HomaIRChart from "@/components/HomaIRChart";
import MarkersTable from "@/components/MarkersTable";
import TriglyceridesHDLRatioChart from "@/components/TriglyceridesHDLRatioChart";
import UricAcidChart from "@/components/UricAcidChart";

export default async function Home() {
  const userId = 1; // Example user ID
  return (
    <main className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Health Markers Dashboard
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Visualizing key health indicators over time.
        </p>
      </div>

      <div className="space-y-12">
        <div className="space-y-8">
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Glucose</h2>
            <GlucoseChart userId={userId} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Glycated Hemoglobin (HbA1c)
            </h2>
            <HemoglobinA1cChart userId={userId} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">HOMA-IR</h2>
            <HomaIRChart userId={userId} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Triglycerides/HDL Ratio
            </h2>
            <TriglyceridesHDLRatioChart userId={userId} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Uric Acid</h2>
            <UricAcidChart />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-center my-8">All Markers</h2>
          <MarkersTable userId={userId} />
        </div>
      </div>
    </main>
  );
}

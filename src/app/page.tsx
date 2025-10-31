import EstradiolChart from "@/components/EstradiolChart";
import GlucoseChart from "@/components/GlucoseChart";
import HemoglobinA1cChart from "@/components/HemoglobinA1cChart";
import HomaIRChart from "@/components/HomaIRChart";
import LiverEnzymesChart from "@/components/LiverEnzymesChart";
import MarkersTable from "@/components/MarkersTable";
import TSHChart from "@/components/TSHChart";
import TotalTestosteroneChart from "@/components/TotalTestosteroneChart";
import TriglyceridesHDLRatioChart from "@/components/TriglyceridesHDLRatioChart";
import UricAcidChart from "@/components/UricAcidChart";
import { openDatabase } from "@/lib/db";

async function getDateRange(userId: number) {
  const { prisma } = await openDatabase();

  const oldest = await prisma.labResult.findFirst({
    where: {
      user_id: userId,
    },
    orderBy: {
      date: "asc",
    },
    select: {
      date: true,
    },
  });

  const newest = await prisma.labResult.findFirst({
    where: {
      user_id: userId,
    },
    orderBy: {
      date: "desc",
    },
    select: {
      date: true,
    },
  });

  if (!oldest || !newest) {
    // If no data, return undefined (charts will use dataMin/dataMax)
    return undefined;
  }

  return {
    min: new Date(oldest.date).getTime(),
    max: new Date(newest.date).getTime(),
  };
}

export default async function Home() {
  const userId = 1; // Example user ID
  const dateRange = await getDateRange(userId);
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
            <GlucoseChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Glycated Hemoglobin (HbA1c)
            </h2>
            <HemoglobinA1cChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">HOMA-IR</h2>
            <HomaIRChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Triglycerides/HDL Ratio
            </h2>
            <TriglyceridesHDLRatioChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Uric Acid</h2>
            <UricAcidChart dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Liver Enzymes</h2>
            <LiverEnzymesChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Total Testosterone</h2>
            <TotalTestosteroneChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Estradiol (E2)</h2>
            <EstradiolChart userId={userId} dateRange={dateRange} />
          </div>
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">TSH</h2>
            <TSHChart userId={userId} dateRange={dateRange} />
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

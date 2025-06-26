import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs/promises";
import path from "path";
import sqlite3Driver from "sqlite3";
import { fileURLToPath } from "url";
import { openDatabase } from "../src/db.ts";
import normalizeGlucose from "../src/normalize_glucose_units.ts";
// No direct import of Chart from 'chart.js/auto' or 'chartjs-adapter-date-fns' needed here
// when using the globalVariableLegacy plugin method with ChartJSNodeCanvas.
// Chart.js core and the adapter specified in plugins should be handled by ChartJSNodeCanvas.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.resolve(__dirname, "../blood_markers.sqlite");
const tableName = "lab_results";
const HOMA_IR_DIVISOR = 405;
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 600;
const OUTPUT_CHART_FILE = path.resolve(__dirname, "../homa_ir_plot.png");

interface HomaIRDataPoint {
  date: string;
  homaIR: number;
}

async function main() {
  console.log(`Querying database: ${dbFilePath}`);

  await using connection = await openDatabase({
    filename: dbFilePath,
    driver: sqlite3Driver.Database,
  });
  const { db } = connection;
  console.log("Connected to SQLite database.");

  const distinctInsulinUnitsQuery = `
SELECT DISTINCT unit FROM ${tableName}
WHERE LOWER(marker_name_en) LIKE '%insulin%'
  AND LOWER(marker_name_en) NOT LIKE '%minutes%'
  AND unit IS NOT NULL AND TRIM(unit) <> '';
`;
  console.log("\nFetching distinct insulin units...");
  const insulinUnitsRows: Array<{ unit: string }> = await db.all(
    distinctInsulinUnitsQuery
  );
  if (insulinUnitsRows.length > 0) {
    console.log("Found distinct insulin units:");
    insulinUnitsRows.forEach((row) => console.log(`- '${row.unit}'`));
  } else {
    console.log("No distinct insulin units found.");
  }
  console.log(
    "Assuming insulin unit is appropriate for HOMA-IR (e.g., µU/mL).\n---"
  );

  const query = `
SELECT
  g.date,
  g.value AS glucose_value,
  g.unit AS glucose_unit,
  i.value AS insulin_value,
  i.unit AS insulin_unit
FROM (
  SELECT date, value, unit, marker_name_en FROM ${tableName}
  WHERE LOWER(marker_name_en) LIKE '%glucose%'
    AND LOWER(marker_name_en) NOT LIKE '%minutes%'
    AND unit IS NOT NULL AND TRIM(unit) <> ''
) AS g
JOIN (
  SELECT date, value, unit, marker_name_en FROM ${tableName}
  WHERE LOWER(marker_name_en) LIKE '%insulin%'
    AND LOWER(marker_name_en) NOT LIKE '%minutes%'
    AND unit IS NOT NULL AND TRIM(unit) <> ''
) AS i
ON g.date = i.date
ORDER BY g.date ASC;
`;

  console.log("\nExecuting query to fetch HOMA-IR data:", query);
  const results = await db.all(query);

  if (results.length === 0) {
    console.log("No results found for HOMA-IR data.");
    return;
  }
  console.log(
    `Found ${results.length} rows. Processing for HOMA-IR and chart data...`
  );

  const homaIRDataPoints: HomaIRDataPoint[] = results
    .map((row) => {
      try {
        const normalizedGlucose = normalizeGlucose({
          value: row.glucose_value,
          unit: row.glucose_unit,
        });
        const glucoseValMgDl = parseFloat(normalizedGlucose.value);
        const insulinValMicroUML = parseFloat(
          row.insulin_value.replace(",", ".")
        );

        if (isNaN(glucoseValMgDl) || isNaN(insulinValMicroUML)) {
          console.warn(
            `Skipping row (Date: ${row.date}): Invalid number for glucose or insulin.`
          );
          return null;
        }
        const homaIR =
          (glucoseValMgDl * insulinValMicroUML) / HOMA_IR_DIVISOR;
        console.log(
          `Date: ${row.date}, Glucose: ${row.glucose_value} ${
            row.glucose_unit
          } -> ${glucoseValMgDl.toFixed(2)} mg/dL, Insulin: ${
            row.insulin_value
          } ${row.insulin_unit} -> ${insulinValMicroUML.toFixed(
            2
          )} µU/mL, HOMA-IR: ${homaIR.toFixed(2)}`
        );
        return { date: row.date, homaIR };
      } catch (error) {
        console.error(
          `Error processing row (Date: ${row.date}): ${
            (error as Error).message
          }`
        );
        return null;
      }
    })
    .filter((point): point is HomaIRDataPoint => point !== null);

  if (homaIRDataPoints.length === 0) {
    console.log("No valid data points to chart after processing.");
    return;
  }
  console.log(
    `\nCollected ${homaIRDataPoints.length} data points for charting.`
  );

  await generateChart(homaIRDataPoints);
}

async function generateChart(homaIRDataPoints: HomaIRDataPoint[]) {
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    backgroundColour: "white",
    plugins: {
      globalVariableLegacy: ["chartjs-adapter-moment"],
    },
  });

  const configuration = {
    type: "line" as const,
    data: {
      datasets: [
        {
          label: "HOMA-IR",
          data: homaIRDataPoints.map((dp) => ({
            x: new Date(dp.date).getTime(),
            y: dp.homaIR,
          })),
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top" as const,
        },
        title: {
          display: true,
          text: "HOMA-IR Over Time",
        },
      },
      scales: {
        x: {
          type: "time" as const,
          time: {
            tooltipFormat: "YYYY-MM-DD",
          },
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          title: {
            display: true,
            text: "HOMA-IR",
          },
          beginAtZero: true,
        },
      },
    },
  };

  console.log("\nGenerating chart image...");
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(
    configuration as any
  );
  await fs.writeFile(OUTPUT_CHART_FILE, imageBuffer);
  console.log(`Chart saved to ${OUTPUT_CHART_FILE}`);
}

main().catch((err) => {
  console.error("An error occurred during the script execution:", err);
  process.exit(1);
});

/**
 * Idempotent English-name unification for lab_results.
 *
 * One analyte was stored under several marker_name_en strings (language,
 * synonym, or accent). This renames those aliases onto the name that
 * already predominates, for user 1 by default.
 *
 * Applies to the committed SQLite file and to docs/labs/extracted/*.csv
 * so a later safe import of those CSVs does not insert the old name.
 * Does not edit historiclabdata.csv or historiclabdata_2025-10-28_from_pdfs.csv.
 * Those archives keep the names they were imported with. Re-importing them
 * after this rename would insert the old names as new rows, because the
 * safe importer dedupes on (date, marker_name_en, value, user_id).
 *
 * A second run matches nothing. marker_name_es is left as printed.
 *
 * Usage: npm run db:canonicalize-markers
 */
import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const dbFilePath = path.resolve(repoRoot, "blood_markers.sqlite");
const extractedDir = path.resolve(repoRoot, "docs/labs/extracted");

const USER_ID = process.env.USER_ID ? parseInt(process.env.USER_ID, 10) : 1;
if (Number.isNaN(USER_ID) || USER_ID < 1) {
  console.error(`Invalid USER_ID: ${process.env.USER_ID}`);
  process.exit(1);
}

type Rule = {
  from: string;
  to: string;
  /** When set, only rows whose trimmed, lowercased unit is in this list. "" is a blank unit. */
  units?: Array<string>;
};

// Predominant name wins. Ties break toward the name already used on the
// newest panels. Units were checked against src/lib/normalize_units.ts
// before a rule was added. Exact marker_name_en match, never a substring,
// so "Insulin" does not swallow "Insulin (120 minutes)".
const RULES: Rule[] = [
  { from: "Uric Acid", to: "Uricemia" },
  { from: "Urea", to: "Uremia" },
  { from: "Fasting Glucose", to: "Glucose" },
  { from: "Blood Glucose", to: "Glucose" },
  // Qualitative urine glucose filed under the serum name. Blank unit, same
  // day as a numeric serum Glucose. Serum rows keep their units.
  { from: "Glucose", to: "Glucose (urine)", units: [""] },
  { from: "Insulin", to: "Basal Insulin" },
  { from: "Total Insulin", to: "Basal Insulin" },
  { from: "Cholesterol", to: "Total Cholesterol" },
  { from: "White Blood Cell Count", to: "White Blood Cells" },
  { from: "Hormona Folículo Estimulante", to: "Follicle-Stimulating Hormone (FSH)" },
  { from: "Hormona Luteinizante", to: "Luteinizing Hormone (LH)" },
  { from: "Hormona Estimuladora de Tiroides", to: "TSH" },
  { from: "Tirotropina (TSH)", to: "TSH" },
  { from: "Estradiol", to: "Estradiol (E2)" },
  { from: "Total T3", to: "Total Triiodothyronine (T3)" },
  { from: "Gamma-GT", to: "Gamma-Glutamyltransferase (GGT)" },
  { from: "Free T4", to: "Free Thyroxine (T4L)" },
  { from: "Calcemia", to: "Total Calcium" },
  { from: "Calcium", to: "Total Calcium" },
  { from: "Phosphatemia", to: "Phosphorus" },
  { from: "Plasma Homocysteine", to: "Homocysteine" },
  { from: "Creatine Phosphokinase", to: "CPK" },
  { from: "MCV", to: "Mean Corpuscular Volume (MCV)" },
  { from: "MCH", to: "Mean Corpuscular Hemoglobin (MCH)" },
  // The other short MCHC row is 34.5 % — same scale, but % is not a g/dL
  // unit in normalize_units.ts, so that row stays "MCHC".
  {
    from: "MCHC",
    to: "Mean Corpuscular Hemoglobin Concentration (MCHC)",
    units: ["g/dl"],
  },
  { from: "Red Cell Distribution Width", to: "RDW" },
  { from: "25(OH) Vitamin D3", to: "25-Hydroxyvitamin D3" },
  { from: "Aspect", to: "Appearance" },
  { from: "Ketones", to: "Ketone Bodies" },
  { from: "Pus cells", to: "Pyocytes" },
  { from: "Total/HDL Ratio", to: "Total/HDL Cholesterol Ratio" },
  // 2024-01-17 value 3.27 equals total cholesterol 219 / HDL 67.
  { from: "Atherogenic Index", to: "Total/HDL Cholesterol Ratio" },
  // Urine dipstick ("no contiene") stored under a bare serum-style name.
  { from: "Proteins", to: "Proteins (urine)" },
  { from: "Protein Electrophoresis: Albumin", to: "Albumin" },
  { from: "Alpha-1 Globulin", to: "Protein Electrophoresis: Alpha-1 Globulin" },
  { from: "Alpha-1 Globulins", to: "Protein Electrophoresis: Alpha-1 Globulin" },
  { from: "Alpha-2 Globulin", to: "Protein Electrophoresis: Alpha-2 Globulin" },
  { from: "Alpha-2 Globulins", to: "Protein Electrophoresis: Alpha-2 Globulin" },
  { from: "Beta-1 Globulin", to: "Protein Electrophoresis: Beta-1 Globulin" },
  { from: "Beta-1 Globulins", to: "Protein Electrophoresis: Beta-1 Globulin" },
  { from: "Beta-2 Globulins", to: "Protein Electrophoresis: Beta-2 Globulin" },
  { from: "Gamma Globulins", to: "Protein Electrophoresis: Gamma Globulin" },
];

const CSV_COLUMNS: Array<string> = [
  "id",
  "date",
  "marker_name_es",
  "marker_name_en",
  "value",
  "unit",
  "reference_range",
  "lab_name",
  "doctor_protocol_notes",
  "derived",
  "comments",
  "other",
];

function unitKey(unit: string | null | undefined): string {
  return (unit ?? "").trim().toLowerCase();
}

function ruleMatches(rule: Rule, name: string, unit: string | null | undefined): boolean {
  if (name !== rule.from) return false;
  if (!rule.units) return true;
  return rule.units.includes(unitKey(unit));
}

function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type LabRow = {
  id: string;
  date: string;
  marker_name_en: string;
  value: string;
  unit: string | null;
};

async function main() {
  const db = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });

  const rows = await db.all<LabRow[]>(
    `SELECT id, date, marker_name_en, value, unit
     FROM lab_results WHERE user_id = ?`,
    USER_ID,
  );

  const byKey = new Map<string, LabRow>();
  for (const row of rows) {
    byKey.set(`${row.date}\0${row.marker_name_en}\0${row.value}`, row);
  }

  const planned: Array<{ id: string; rule: Rule; unit: string | null }> = [];
  for (const rule of RULES) {
    for (const row of rows) {
      if (!ruleMatches(rule, row.marker_name_en, row.unit)) continue;
      const collision = byKey.get(`${row.date}\0${rule.to}\0${row.value}`);
      if (collision && collision.id !== row.id) {
        throw new Error(
          `Refusing to rename ${row.id} (${row.date} ${rule.from} → ${rule.to}): ` +
            `a row with the same date and value already exists (${collision.id})`,
        );
      }
      planned.push({ id: row.id, rule, unit: row.unit });
    }
  }

  await db.exec("BEGIN");
  try {
    for (const change of planned) {
      await db.run(
        `UPDATE lab_results SET marker_name_en = ? WHERE id = ? AND user_id = ?`,
        change.rule.to,
        change.id,
        USER_ID,
      );
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }

  const grouped = new Map<string, { rule: Rule; units: Set<string>; n: number }>();
  for (const change of planned) {
    const key = `${change.rule.from}\0${change.rule.to}\0${(change.rule.units ?? []).join("|")}`;
    let bucket = grouped.get(key);
    if (!bucket) {
      bucket = { rule: change.rule, units: new Set(), n: 0 };
      grouped.set(key, bucket);
    }
    bucket.n += 1;
    bucket.units.add(unitKey(change.unit) === "" ? "(blank)" : (change.unit ?? ""));
  }

  console.log(`user_id=${USER_ID} renamed ${planned.length} lab_results rows`);
  for (const bucket of grouped.values()) {
    const unitNote = bucket.rule.units ? ` [only unit ${bucket.rule.units.join(", ")}]` : "";
    console.log(
      `  ${bucket.n}\t${bucket.rule.from} -> ${bucket.rule.to}${unitNote}\tunits: ${[...bucket.units].join(", ")}`,
    );
  }
  if (planned.length === 0) {
    console.log("  (no database rows changed; already canonical)");
  }

  const csvNames = await fs.readdir(extractedDir);
  let csvRows = 0;
  let csvFiles = 0;
  for (const name of csvNames.filter((n) => n.endsWith(".csv")).sort()) {
    const filePath = path.join(extractedDir, name);
    const raw = await fs.readFile(filePath, "utf8");
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: false,
    }) as Array<Record<string, string>>;
    let changed = 0;
    for (const record of records) {
      const rule = RULES.find((candidate) =>
        ruleMatches(candidate, record.marker_name_en, record.unit),
      );
      if (!rule) continue;
      record.marker_name_en = rule.to;
      changed += 1;
    }
    if (changed === 0) continue;
    const header = CSV_COLUMNS.join(",");
    const lines = records.map((record) =>
      CSV_COLUMNS.map((col) => escapeCsvField(record[col])).join(","),
    );
    const trailingNewline = raw.endsWith("\n") ? "\n" : "";
    await fs.writeFile(filePath, [header, ...lines].join("\n") + trailingNewline);
    csvFiles += 1;
    csvRows += changed;
    console.log(`  csv ${name}: ${changed} cells`);
  }
  console.log(`extracted CSVs: ${csvRows} cells in ${csvFiles} files`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

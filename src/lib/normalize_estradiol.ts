type PartialRow = {
  value: string;
  unit: string;
};

export default function normalizeEstradiol(row: PartialRow): PartialRow {
  const unit = row.unit.trim().toLowerCase();
  // Handle "<" values like "<5" by extracting the numeric part
  const valueStr = row.value.replace(",", ".").replace(/^</, "");
  const rawValue = parseFloat(valueStr);

  // pg/mL and pg/ml are the same unit, just case difference
  // Normalize to pg/mL
  if (unit === "pg/ml") {
    return {
      value: rawValue.toString(),
      unit: "pg/mL",
    };
  }

  throw new Error(`Unsupported unit for estradiol: "${row.unit}"`);
}

type PartialRow = {
  value: string;
  unit: string;
};

export default function normalizeTestosterone(row: PartialRow): PartialRow {
  const unit = row.unit.trim().toLowerCase();
  // Handle "<" values like "<5" by extracting the numeric part
  const valueStr = row.value.replace(",", ".").replace(/^</, "");
  const rawValue = parseFloat(valueStr);

  let normalized: number;

  switch (unit) {
    case "ng/ml": {
      normalized = rawValue;
      break;
    }
    case "ng/dl": {
      // Convert ng/dL to ng/mL: 1 ng/mL = 100 ng/dL
      normalized = rawValue / 100;
      break;
    }
    default: {
      throw new Error(`Unsupported unit for testosterone: "${row.unit}"`);
    }
  }

  return {
    value: normalized.toString(),
    unit: "ng/mL",
  };
}

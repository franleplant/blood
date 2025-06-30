type PartialRow = {
  value: string;
  unit: string;
};

export default function normalizeUnits(row: PartialRow): PartialRow {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseFloat(row.value.replace(",", "."));

  let normalized: number;

  switch (unit) {
    case "mg/dl": {
      normalized = rawValue;
      break;
    }
    case "g/l":
    case "gr o/oo": {
      normalized = rawValue * 100;
      break;
    }
    default: {
      throw new Error(`Unsupported unit for glucose: "${row.unit}"`);
    }
  }

  return {
    value: normalized.toString(),
    unit: "mg/dL",
  };
}

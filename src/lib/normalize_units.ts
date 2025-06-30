type PartialRow = {
  value: string;
  unit: string;
};

type TargetUnit = "mg/dL";

function toMgPerDL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseFloat(row.value.replace(",", "."));

  switch (unit) {
    case "mg/dl":
      return rawValue;
    case "g/l":
    case "gr o/oo":
      return rawValue * 100;
    default:
      throw new Error(`Unsupported unit for glucose: "${row.unit}"`);
  }
}

export default function normalizeUnits(
  row: PartialRow,
  targetUnit: TargetUnit
): PartialRow {
  const valueInMgPerDL = toMgPerDL(row);

  switch (targetUnit) {
    case "mg/dL":
      return {
        value: valueInMgPerDL.toString(),
        unit: targetUnit,
      };
  }
}

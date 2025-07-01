type PartialRow = {
  value: string;
  unit: string;
};

type TargetUnit = "mg/dL" | "%";

const HBA1C_CONVERSION_FACTOR = 0.0915;
const HBA1C_CONVERSION_OFFSET = 2.15;

function toMgPerDL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseFloat(row.value.replace(",", "."));

  switch (unit) {
    case "mg/dl":
    case "mg %":
      return rawValue;
    case "g/l":
    case "gr/lt":
    case "gr o/oo":
      return rawValue * 100;
    default:
      throw new Error(
        `Unsupported unit for conversion to mg/dL: "${row.unit}"`
      );
  }
}

function toPercent(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseFloat(row.value.replace(",", "."));

  if (isNaN(rawValue)) {
    throw new Error(`Invalid number value for row: ${JSON.stringify(row)}`);
  }

  switch (unit) {
    case "%":
      return rawValue;
    case "mmol/mol":
      return rawValue * HBA1C_CONVERSION_FACTOR + HBA1C_CONVERSION_OFFSET;
    default:
      throw new Error(`Unsupported unit for conversion to %: "${row.unit}"`);
  }
}

export default function normalizeUnits(
  row: PartialRow,
  targetUnit: TargetUnit
): PartialRow {
  switch (targetUnit) {
    case "mg/dL": {
      const valueInMgPerDL = toMgPerDL(row);
      return {
        value: valueInMgPerDL.toString(),
        unit: targetUnit,
      };
    }
    case "%": {
      const valueInPercent = toPercent(row);
      return {
        value: valueInPercent.toFixed(1),
        unit: targetUnit,
      };
    }
  }
}

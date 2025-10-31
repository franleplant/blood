type PartialRow = {
  value: string;
  unit: string;
};

type TargetUnit = "mg/dL" | "%" | "U/L" | "ng/mL" | "pg/mL" | "µUI/mL";

const HBA1C_CONVERSION_FACTOR = 0.0915;
const HBA1C_CONVERSION_OFFSET = 2.15;

// Helper function to parse value, handling "<" prefix and decimal separators
function parseValue(value: string): number {
  // Handle "<" values like "<5" by extracting the numeric part
  const valueStr = value.replace(",", ".").replace(/^</, "");
  return parseFloat(valueStr);
}

function toMgPerDL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

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
  const rawValue = parseValue(row.value);

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

function toUL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  if (isNaN(rawValue)) {
    throw new Error(`Invalid number value for row: ${JSON.stringify(row)}`);
  }

  switch (unit) {
    case "u/l":
    case "ui/l":
      return rawValue;
    default:
      // Assuming if the unit is not specified but is one of the markers, the value is already correct.
      return rawValue;
  }
}

function toNgPerML(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  switch (unit) {
    case "ng/ml": {
      return rawValue;
    }
    case "ng/dl": {
      // Convert ng/dL to ng/mL: 1 ng/mL = 100 ng/dL
      return rawValue / 100;
    }
    default: {
      throw new Error(
        `Unsupported unit for conversion to ng/mL: "${row.unit}"`
      );
    }
  }
}

function toPgPerML(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  // pg/mL and pg/ml are the same unit, just case difference
  // Normalize to pg/mL
  if (unit === "pg/ml") {
    return rawValue;
  }

  throw new Error(`Unsupported unit for conversion to pg/mL: "${row.unit}"`);
}

function toMicroUIPerML(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  // All these are variations of micro international units per milliliter
  // µUI/mL, µUI/ml, µU/ml, uUI/ml are all the same unit
  // Normalize to µUI/mL
  // Note: µ might be converted to 'u' or 'm' when lowercased depending on system
  if (
    unit === "µui/ml" ||
    unit === "uui/ml" ||
    unit === "mui/ml" ||
    unit === "µu/ml" ||
    unit === "uu/ml" ||
    unit === "mu/ml"
  ) {
    return rawValue;
  }

  throw new Error(`Unsupported unit for conversion to µUI/mL: "${row.unit}"`);
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
    case "U/L": {
      const valueInUL = toUL(row);
      return {
        value: valueInUL.toString(),
        unit: targetUnit,
      };
    }
    case "ng/mL": {
      const valueInNgPerML = toNgPerML(row);
      return {
        value: valueInNgPerML.toString(),
        unit: targetUnit,
      };
    }
    case "pg/mL": {
      const valueInPgPerML = toPgPerML(row);
      return {
        value: valueInPgPerML.toString(),
        unit: targetUnit,
      };
    }
    case "µUI/mL": {
      const valueInMicroUIPerML = toMicroUIPerML(row);
      return {
        value: valueInMicroUIPerML.toString(),
        unit: targetUnit,
      };
    }
  }
}

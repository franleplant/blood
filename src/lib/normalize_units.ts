type PartialRow = {
  value: string;
  unit: string;
};

type TargetUnit =
  | "mg/dL"
  | "%"
  | "U/L"
  | "ng/mL"
  | "ng/dL"
  | "pg/mL"
  | "µUI/mL"
  | "µg/dL"
  | "g/dL"
  | "K/µL";

const HBA1C_CONVERSION_FACTOR = 0.0915;
const HBA1C_CONVERSION_OFFSET = 2.15;
// Testosterone MW = 288.4 g/mol → 1 nmol/L = 0.2884 ng/mL, 1 pmol/L = 0.2884 pg/mL.
// Only valid for testosterone-family markers (Free T, Bioavailable T).
const TESTOSTERONE_MOLAR_FACTOR = 0.2884;

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
    case "mg%":
      return rawValue;
    case "mg/l":
    case "mg/lt":
      // 1 mg/L = 0.1 mg/dL
      return rawValue / 10;
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
    case "nmol/l": {
      // Testosterone-only conversion (MW 288.4).
      return rawValue * TESTOSTERONE_MOLAR_FACTOR;
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

  if (unit === "pg/ml") return rawValue;
  if (unit === "pmol/l") {
    // Testosterone-only conversion (MW 288.4).
    return rawValue * TESTOSTERONE_MOLAR_FACTOR;
  }

  throw new Error(`Unsupported unit for conversion to pg/mL: "${row.unit}"`);
}

function toMicroGramPerDL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  switch (unit) {
    case "µg/dl":
    case "ug/dl":
    case "mcg/dl":
      return rawValue;
    default:
      throw new Error(
        `Unsupported unit for conversion to µg/dL: "${row.unit}"`
      );
  }
}

function toNgPerDL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  switch (unit) {
    case "ng/dl":
      return rawValue;
    case "ng/ml":
      // 1 ng/mL = 100 ng/dL
      return rawValue * 100;
    default:
      throw new Error(
        `Unsupported unit for conversion to ng/dL: "${row.unit}"`
      );
  }
}

function toGramPerDL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  switch (unit) {
    case "g/dl":
    case "g%":
    case "gr%":
    case "grs.%":
    case "grs%":
      return rawValue;
    case "g/l":
      return rawValue / 10;
    default:
      throw new Error(
        `Unsupported unit for conversion to g/dL: "${row.unit}"`
      );
  }
}

function toKPerMicroL(row: PartialRow): number {
  const unit = row.unit.trim().toLowerCase();
  const rawValue = parseValue(row.value);

  switch (unit) {
    case "x10^3/µl":
    case "x10^3/ul":
    case "10^3/µl":
    case "10^3/ul":
    case "k/µl":
    case "k/ul":
      return rawValue;
    case "/mm³":
    case "/mm3":
    case "por mm³":
    case "por mm3":
    case "/µl":
    case "por µl":
      // /mm³ = /µL; raw cells/µL ÷ 1000 → 10³/µL.
      return rawValue / 1000;
    default:
      throw new Error(
        `Unsupported unit for conversion to K/µL: "${row.unit}"`
      );
  }
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
    case "µg/dL": {
      const valueInMicroGramPerDL = toMicroGramPerDL(row);
      return {
        value: valueInMicroGramPerDL.toString(),
        unit: targetUnit,
      };
    }
    case "ng/dL": {
      const valueInNgPerDL = toNgPerDL(row);
      return {
        value: valueInNgPerDL.toString(),
        unit: targetUnit,
      };
    }
    case "g/dL": {
      const valueInGramPerDL = toGramPerDL(row);
      return {
        value: valueInGramPerDL.toString(),
        unit: targetUnit,
      };
    }
    case "K/µL": {
      const valueInKPerMicroL = toKPerMicroL(row);
      return {
        value: valueInKPerMicroL.toString(),
        unit: targetUnit,
      };
    }
  }
}

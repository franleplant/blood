type PartialRow = {
  value: string;
  unit: string;
};

export default function normalizeTSH(row: PartialRow): PartialRow {
  const unit = row.unit.trim().toLowerCase();
  // Handle "<" values like "<5" by extracting the numeric part
  const valueStr = row.value.replace(",", ".").replace(/^</, "");
  const rawValue = parseFloat(valueStr);

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
    return {
      value: rawValue.toString(),
      unit: "µUI/mL",
    };
  }

  throw new Error(`Unsupported unit for TSH: "${row.unit}"`);
}


import { z } from "zod";

const preprocessValue = z.preprocess((val) => {
  if (typeof val === "string") {
    const num = parseFloat(val.replace(",", "."));
    if (!isNaN(num)) {
      return num;
    }
  }
  return val;
}, z.union([z.number(), z.string()]));

export const labResultsRowSchema = z.object({
  id: z.number(),
  date: z.coerce.date(),
  marker_name_es: z.string(),
  marker_name_en: z.string(),
  value: preprocessValue,
  unit: z.string().optional(),
  reference_range: z.string().optional(),
  lab_name: z.string().optional(),
  doctor_protocol_notes: z.string().optional().nullable(),
  derived: z.string().nullable(),
  comments: z.string().optional().nullable(),
  other: z.string().optional().nullable(),
});

export type LabResultsRow = z.infer<typeof labResultsRowSchema>;

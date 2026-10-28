import { z } from "zod";
export const fuelTypes = [
  "petrol",
  "diesel",
  "hybrid",
  "electric",
  "lpg",
  "other",
] as const;
export const inductionTypes = [
  "naturally_aspirated",
  "turbo",
  "supercharged",
  "other",
] as const;
export const transmissionTypes = [
  "manual",
  "automatic",
  "cvt",
  "dct",
  "other",
] as const;
const optionalText = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .optional()
  .transform((v) => v || null);
export const vehicleInput = z.object({
  id: z.string().trim().min(1).max(100),
  model_id: z.string().min(1).max(100),
  year: z.number().int().min(1950).max(2100),
  engine: z.string().trim().min(1).max(100),
  generation_id: optionalText,
  engine_code: optionalText,
  engine_capacity: z.number().int().min(1).max(20000).nullable().optional(),
  body: optionalText,
  trim: optionalText,
  fuel_type: z.enum(fuelTypes).nullable().optional(),
  forced_induction: z.enum(inductionTypes).nullable().optional(),
  transmission: z.enum(transmissionTypes).nullable().optional(),
});

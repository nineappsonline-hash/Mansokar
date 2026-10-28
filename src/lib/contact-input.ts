import { z } from "zod";
export const contactInput = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^01[0125][0-9]{8}$/, "Enter a valid Egyptian mobile number"),
  topic: z.enum(["shipping", "returns", "warranty", "other"]),
  inquiry: z.string().trim().min(10).max(3000),
  consent: z.literal("yes"),
  ui_locale: z.enum(["ar", "en"]).default("ar"),
});

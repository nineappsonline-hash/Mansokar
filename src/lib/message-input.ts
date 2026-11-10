import { z } from "zod";
export const messageInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^01[0125][0-9]{8}$/, "Enter a valid Egyptian mobile number"),
  email: z.email().max(254),
  body: z.string().trim().min(10).max(3000),
  ui_locale: z.enum(["ar", "en"]).default("ar"),
});

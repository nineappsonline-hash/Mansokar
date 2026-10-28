import { z } from "zod";
export const shippingInput = z
  .object({
    id: z.string().min(1).max(100),
    governorate: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    enabled: z.boolean(),
    amount: z.number().int().min(0).max(100000000).nullable(),
    service_type: z.enum(["standard", "express"]).optional(),
    delivery_min_hours: z.number().int().positive().nullable().optional(),
    delivery_max_hours: z.number().int().positive().nullable().optional(),
    business_days: z.boolean().optional(),
    starts_at: z.iso.datetime({ offset: true }).optional(),
    ends_at: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .refine((v) => !v.enabled || v.amount !== null, {
    message: "Set a shipping rate before enabling delivery",
    path: ["amount"],
  });

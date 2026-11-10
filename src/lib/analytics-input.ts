import { z } from "zod";
export const browserEventNames = [
  "view_item",
  "search",
  "select_item",
  "add_to_cart",
  "begin_checkout",
  "part_request",
  "add_shipping_info",
  "add_payment_info",
  "vehicle_selected",
  "compatibility_checked",
  "compatibility_confirmed",
  "part_number_searched",
  "request_part_submitted",
] as const;
export const browserAnalyticsInput = z
  .object({
    event: z.enum(browserEventNames),
    product: z.string().max(150).optional(),
    context: z
      .object({
        locale: z.enum(["ar", "en"]).optional(),
        page_type: z
          .enum([
            "home",
            "brand",
            "model",
            "product",
            "guide",
            "catalog",
            "checkout",
            "other",
          ])
          .optional(),
        source: z
          .enum(["organic", "ai_referral", "referral", "direct", "unknown"])
          .optional(),
        make: z
          .string()
          .regex(/^[a-z0-9-]{1,80}$/)
          .optional(),
        model: z
          .string()
          .regex(/^[a-z0-9-]{1,100}$/)
          .optional(),
        year: z.number().int().min(1950).max(2100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

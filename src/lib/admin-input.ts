import { z } from "zod";
const optionalAmount = (v: unknown) => (v === "" ? undefined : v);
export const inquiryUpdateInput = z
  .object({
    id: z.uuid(),
    status: z.enum(["pending", "quoted", "resolved", "closed"]),
    quoted_amount: z.preprocess(
      optionalAmount,
      z.coerce.number().int().min(0).optional(),
    ),
    quoted_amount_egp: z.preprocess(
      optionalAmount,
      z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    ),
    staff_notes: z.string().max(5000).optional(),
  })
  .transform(({ quoted_amount_egp, ...input }) => ({
    ...input,
    quoted_amount:
      quoted_amount_egp === undefined
        ? input.quoted_amount
        : quoted_amount_egp * 100,
  }));
export const couponInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,40}$/),
    kind: z.enum(["fixed", "percentage"]),
    amount: z.number().int().positive(),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    max_redemptions: z.number().int().positive(),
    per_customer_limit: z.number().int().positive().nullable().optional(),
    scope_category: z.string().max(100).nullable().optional(),
  })
  .refine((v) => v.kind !== "percentage" || v.amount <= 100, {
    message: "Percentage must be at most 100",
    path: ["amount"],
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: "Coupon end must follow its start",
    path: ["ends_at"],
  });

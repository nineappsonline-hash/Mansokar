import { z } from "zod";
import { isProductImagePath } from "./image-links";
export const localized = z.object({
  ar: z.string().min(1).max(5000),
  en: z.string().min(1).max(5000),
});
export const productInput = z
  .object({
    id: z.string().max(100).optional(),
    sku: z.string().min(1).max(100),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(150),
    name: localized,
    description: localized,
    manufacturer: z.string().min(1).max(100),
    category: z.string().min(1).max(100),
    family: z.string().min(1).max(100),
    type: z.enum(["oem", "aftermarket"]),
    price: z.number().int().min(0).max(1000000000),
    sale: z.number().int().min(0).nullable(),
    partNumber: z.string().min(1).max(100),
    partNumbers: z.array(z.string().min(1).max(100)).max(100).optional(),
    synonyms: z
      .object({
        ar: z.array(z.string().max(100)),
        en: z.array(z.string().max(100)),
      })
      .optional(),
    seo: z
      .object({
        title: z
          .object({
            ar: z.string().max(200).default(""),
            en: z.string().max(200).default(""),
          })
          .optional(),
        description: z
          .object({
            ar: z.string().max(500).default(""),
            en: z.string().max(500).default(""),
          })
          .optional(),
      })
      .optional(),
    policy_refs: z.array(z.string().max(150)).max(20).optional(),
    condition: z.literal("new").optional(),
    demo: z.boolean(),
    orderable: z.boolean(),
    status: z.enum(["draft", "published"]),
    fitments: z
      .array(z.string().min(1).max(100))
      .max(500)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Duplicate fitment configuration",
      )
      .optional(),
    images: z
      .array(
        z.object({
          path: z
            .string()
            .max(2000)
            .refine(
              isProductImagePath,
              "Use an uploaded image path or an https image link",
            ),
          alt: localized,
        }),
      )
      .max(10)
      .optional(),
    cost: z.number().int().min(0).nullable().optional(),
    warranty: localized.nullable().optional(),
    editorial: z
      .object({ why: localized.optional(), installation: localized.optional() })
      .optional(),
    specs: z.record(z.string().max(120), z.string().max(1000)).default({}),
  })
  .refine((p) => p.sale === null || p.sale < p.price, {
    message: "Sale must be less than list price",
  });
export const checkoutInput = z.object({
  key: z.uuid(),
  review_total: z.number().int().min(0).max(100000000000),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(40),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^01[0125][0-9]{8}$/),
  email: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.email().max(254).optional(),
  ),
  address: z.string().min(10).max(500),
  area: z.string().min(1).max(100),
  coupon: z.string().max(40).optional(),
  vehicle: z.string().max(100).optional(),
  locale: z.enum(["ar", "en"]),
  method: z.enum(["cod", "card", "instapay", "wallet", "installments"]),
  imageToken: z.uuid().optional(),
  consent: z.literal("yes"),
});
export const importRows = z
  .array(productInput)
  .min(1)
  .max(1000)
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((r, index) => {
      if (seen.has(r.sku))
        ctx.addIssue({
          code: "custom",
          message: "Duplicate SKU in import",
          path: [index, "sku"],
        });
      seen.add(r.sku);
    });
  });
